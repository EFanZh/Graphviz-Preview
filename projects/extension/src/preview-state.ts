import { Channel } from "../../shared/src/channel";
import type { ChannelMessage } from "../../shared/src/channel";
import type { ChannelClient } from "../../shared/src/channel";
import type { ExtensionRequest, ExtensionResponse } from "../../shared/src/extension-api";
import { ExtensionCommand } from "../../shared/src/extension-api";
import type {
    UpdatePreviewRequest,
    UpdatePreviewResponse,
    WebviewRequest,
    WebviewResponse,
} from "../../shared/src/webview-api";
import { WebviewCommand } from "../../shared/src/webview-api";
import type { Context } from "./preview-manager";
import { Scheduler } from "./scheduler";
import * as crypto from "crypto";
import * as os from "os";
import * as path from "path";
import type { TextDocument, Webview, WebviewPanel } from "vscode";
import { Uri, window, ViewColumn, workspace } from "vscode";

const previewType = "graphviz.preview";
const webviewPlaceholder = /\{([^{}]+)\}/g;

function getPreviewTitle(document: TextDocument) {
    return `Preview: ${path.basename(document.fileName)}`;
}

function setWebviewHtml(context: Context, document: TextDocument, webview: Webview) {
    const baseUri = webview.asWebviewUri(document.uri).toString();
    const cspSource = webview.cspSource;
    const nonce = crypto.randomBytes(32).toString("base64");
    const csp = `default-src 'none'; img-src ${cspSource}; script-src ${cspSource}; style-src ${cspSource} 'nonce-${nonce}';`;
    const extensionUri = webview.asWebviewUri(context.extensionContext.extensionUri).toString();

    webview.html = context.webviewTemplate.replace(webviewPlaceholder, (fallback, key) => {
        switch (key) {
            case "base-uri":
                return baseUri;
            case "csp":
                return csp;
            case "extension-uri":
                return extensionUri;
            case "nonce":
                return nonce;
            default:
        }

        return fallback;
    });
}

function createWebviewPanel(context: Context, document: TextDocument): WebviewPanel {
    const localResourceRoots = [context.extensionContext.extensionUri];
    const workspaceFolders = workspace.workspaceFolders;

    if (workspaceFolders !== undefined) {
        for (const folder of workspaceFolders) {
            localResourceRoots.push(folder.uri);
        }
    }

    localResourceRoots.push(Uri.file(path.dirname(document.fileName)));

    const webviewPanel = window.createWebviewPanel(
        previewType,
        getPreviewTitle(document),
        {
            preserveFocus: true,
            viewColumn: ViewColumn.Beside,
        },
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots,
        },
    );

    setWebviewHtml(context, document, webviewPanel.webview);

    return webviewPanel;
}

export class PreviewState implements ChannelClient<ExtensionRequest, ExtensionResponse, WebviewRequest> {
    private readonly channel: Channel<ExtensionRequest, ExtensionResponse, WebviewRequest, WebviewResponse> =
        new Channel();

    private readonly scheduler = new Scheduler(os.cpus().length); // TODO: Use `os.availableParallelism()`.

    private constructor(
        private readonly context: Context,
        private readonly document: TextDocument,
        private readonly webviewPanel: WebviewPanel,
    ) {}

    public static create(context: Context, document: TextDocument, onDispose: () => void): PreviewState {
        const webviewPanel = createWebviewPanel(context, document);
        const previewState = new PreviewState(context, document, webviewPanel);

        // Setup event handlers.

        webviewPanel.onDidDispose(onDispose);

        // TODO: Unsubscribe?
        webviewPanel.webview.onDidReceiveMessage(previewState.receiveWebviewMessage.bind(previewState));

        previewState.updatePreview();

        return previewState;
    }

    private sendWebviewRequest(request: UpdatePreviewRequest): Promise<UpdatePreviewResponse>;

    private sendWebviewRequest(request: WebviewRequest) {
        return this.channel.sendRequest(this, request);
    }

    private updatePreview() {
        function handleError(reason: unknown): string {
            if (reason instanceof Error) {
                return reason.message;
            }

            return `Error: ${reason}`;
        }

        const document = this.document;
        const configuration = this.context.configuration.resolve(document);

        // Lock task parameters.

        const documentDir = path.dirname(document.fileName);
        const source = document.getText();

        // Schedule rendering.

        const sendWebviewRequest = this.sendWebviewRequest.bind(this);

        this.scheduler.schedule(
            (onCancel) => configuration.engine.render(configuration, documentDir, source, onCancel),
            (images) => sendWebviewRequest({ command: WebviewCommand.UpdatePreview, success: true, images }),
            (reason) =>
                sendWebviewRequest({
                    command: WebviewCommand.UpdatePreview,
                    success: false,
                    reason: handleError(reason),
                }),
        );
    }

    private async saveImage() {
        const document = this.document;
        const documentDir = path.dirname(document.fileName);

        try {
            await this.context.configuration.engine.save(this.context.configuration, documentDir, document.getText());
        } catch (error) {
            const message = error instanceof Error ? error.message : `${error}`;

            window.showErrorMessage(message);
        }
    }

    // =============================================== System events ================================================ //

    // Webview message.

    public receiveWebviewMessage(message: ChannelMessage<ExtensionRequest, WebviewResponse>) {
        this.channel.receiveMessage(this, message);
    }

    // `PreviewCommand` event.

    public onPreviewCommand() {
        this.webviewPanel.reveal();
    }

    // `DidChangeTextDocument` event.

    public onDidChangeTextDocument() {
        this.updatePreview();
    }

    // =========================================== `ChannelClient` events =========================================== //

    public send(data: ChannelMessage<WebviewRequest, WebviewResponse>): void {
        this.webviewPanel.webview.postMessage(data);
    }

    public async receive(request: ExtensionRequest): Promise<ExtensionResponse> {
        switch (request.command) {
            case ExtensionCommand.SaveImage: {
                this.saveImage();

                break;
            }
        }
    }
}
