import * as vscode from "vscode";
import * as engines from "./engines";
import { ExtensionRequest, ExtensionResponse, PreviewRequest, PreviewResponse } from "./messages";
import { createMessenger, IMessagePort, IReceiveMessage, ISendMessage } from "./messenger";
import * as utilities from "./utilities";

const previewType = "graphviz.preview";

class PreviewPort implements
    IMessagePort<ISendMessage<PreviewRequest, ExtensionResponse>, IReceiveMessage<PreviewResponse, ExtensionRequest>> {
    public constructor(private readonly view: vscode.Webview) {
    }

    public send(message: ISendMessage<PreviewRequest, ExtensionResponse>): void {
        this.view.postMessage(message);
    }

    public onReceive(handler: (message: IReceiveMessage<PreviewResponse, ExtensionRequest>) => void): void {
        this.view.onDidReceiveMessage(handler);
    }
}

function getPreviewColumn(activeColumn?: vscode.ViewColumn): vscode.ViewColumn {
    switch (activeColumn) {
        case vscode.ViewColumn.One:
            return vscode.ViewColumn.Two;
        default:
            return vscode.ViewColumn.Three;
    }
}

function makeTitle(document: vscode.TextDocument): string {
    return `Preview: ${document.fileName}`;
}

async function exportImage(image: string): Promise<void> {
    const filePath = await vscode.window.showSaveDialog({ filters: { "SVG Image": ["svg"] } });

    if (filePath) {
        await utilities.writeFileAsync(filePath.fsPath, image);
    }
}

async function handleRequest(message: ExtensionRequest): Promise<ExtensionResponse> {
    switch (message.type) {
        case "export":
            await exportImage(message.image);
            break;
    }

    return undefined;
}

function createMessengerForWebview(view: vscode.Webview): (message: PreviewRequest) => Promise<PreviewResponse> {
    return createMessenger(new PreviewPort(view), handleRequest);
}

export class PreviewManager {
    private readonly previewContent: string;
    private readonly previews = new WeakMap<vscode.TextDocument, vscode.WebviewPanel>();
    private readonly documents = new WeakMap<vscode.WebviewPanel, vscode.TextDocument>();
    private readonly messengers = new WeakMap<vscode.Webview, (message: PreviewRequest) => Promise<PreviewResponse>>();
    private readonly engine = engines.getEngine();

    public constructor(context: vscode.ExtensionContext, template: string) {
        const previewDirUri = vscode.Uri.file(context.asAbsolutePath("out/preview"));

        this.previewContent = template.replace(
            /\{preview-dir\}/g,
            previewDirUri.with({ scheme: "vscode-resource" }).toString(true)
        );
    }

    public async showPreview(editor: vscode.TextEditor): Promise<void> {
        const document = editor.document;

        let result = this.previews.get(document);

        if (result === undefined) {
            result = await this.createPreview(getPreviewColumn(editor.viewColumn), document);
        } else {
            result.reveal(result.viewColumn || getPreviewColumn(editor.viewColumn));
        }
    }

    public async updatePreview(document: vscode.TextDocument): Promise<void> {
        const preview = this.previews.get(document);

        if (preview !== undefined) {
            await this.updatePreviewContent(preview, document);
        }
    }

    private async createPreview(
        column: vscode.ViewColumn,
        document: vscode.TextDocument
    ): Promise<vscode.WebviewPanel> {
        const result = vscode.window.createWebviewPanel(
            previewType,
            makeTitle(document),
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        result.webview.html = this.previewContent;

        // Add bindings.

        this.previews.set(document, result);
        this.documents.set(result, document);

        const messenger = createMessengerForWebview(result.webview);

        this.messengers.set(result.webview, messenger);

        // Add event handlers.

        result.onDidDispose(() => this.previews.delete(document));

        result.onDidChangeViewState(((e) => {
            if (e.webviewPanel.visible) {
                this.updatePreviewContent(e.webviewPanel, this.documents.get(e.webviewPanel)!);
            }
        }));

        // Initialize.

        await messenger({ type: "initialize" });
        await this.updatePreviewContentWithMessenger(result, messenger, document);

        return result;
    }

    private async updatePreviewContentWithMessenger(
        preview: vscode.WebviewPanel,
        messenger: (message: PreviewRequest) => Promise<PreviewResponse>,
        document: vscode.TextDocument
    ): Promise<void> {
        preview.title = makeTitle(document);

        try {
            await messenger({
                image: await this.engine(document.getText()),
                type: "success"
            });
        } catch (error) {
            await messenger({
                message: error,
                type: "failure"
            });
        }
    }

    private async updatePreviewContent(preview: vscode.WebviewPanel, document: vscode.TextDocument): Promise<void> {
        await this.updatePreviewContentWithMessenger(preview, this.messengers.get(preview.webview)!, document);
    }
}
