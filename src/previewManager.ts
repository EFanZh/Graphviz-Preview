import * as vscode from "vscode";
import * as engines from "./engines";
import { ExtensionRequest, ExtensionResponse, PreviewRequest, PreviewResponse } from "./messages";
import { createMessenger, IMessagePort, IReceiveMessage, ISendMessage } from "./messenger";
import { createScheduler } from "./scheduler";
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
        await utilities.writeFileAsync(filePath.fsPath, image, "utf8");
    }
}

function createMessengerForWebview(view: vscode.Webview): (message: PreviewRequest) => Promise<PreviewResponse> {
    async function handleRequest(message: ExtensionRequest): Promise<ExtensionResponse> {
        switch (message.type) {
            case "export":
                await exportImage(message.image);
                break;
        }

        return undefined;
    }

    return createMessenger<PreviewRequest, PreviewResponse, ExtensionRequest, ExtensionResponse>(
        new PreviewPort(view),
        handleRequest
    );
}

function createSchedulerForWebview(
    engine: (source: string, cancel: Promise<void>) => Promise<string>,
    messenger: (message: PreviewRequest) => Promise<PreviewResponse>
): (arg: string) => void {
    function onResult(result: string): void {
        messenger({
            image: result,
            type: "success"
        });
    }

    function onError(error: Error): void {
        messenger({
            message: error.message,
            type: "failure"
        });
    }

    return createScheduler(engine, onResult, onError);
}

export class PreviewManager {
    private readonly previewContent: string;
    private readonly previews = new WeakMap<vscode.TextDocument, vscode.WebviewPanel>();
    private readonly documents = new WeakMap<vscode.WebviewPanel, vscode.TextDocument>();
    private readonly schedulers = new WeakMap<vscode.Webview, (arg: string) => void>();
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
            await this.updatePreviewContent(preview.webview, document);
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
        const scheduler = createSchedulerForWebview(this.engine, messenger);

        this.schedulers.set(result.webview, scheduler);

        // Add event handlers.

        result.onDidDispose(() => this.previews.delete(document));

        result.onDidChangeViewState(((e) => {
            if (e.webviewPanel.visible) {
                this.updatePreviewContent(e.webviewPanel.webview, this.documents.get(e.webviewPanel)!);
            }
        }));

        // Initialize.

        await messenger({ type: "initialize" });

        this.updatePreviewContent(result.webview, document);

        return result;
    }

    private updatePreviewContent(view: vscode.Webview, document: vscode.TextDocument): void {
        this.schedulers.get(view)!(document.getText());
    }
}
