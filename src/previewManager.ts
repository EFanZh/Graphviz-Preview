import * as path from "path";
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

function uriToVscodeResource(uri: vscode.Uri): string {
    return uri.with({ scheme: "vscode-resource" }).toString(true);
}

async function exportImage(image: string): Promise<void> {
    const filePath = await vscode.window.showSaveDialog({ filters: { "SVG Image": ["svg"] } });

    if (filePath) {
        await utilities.writeFileAsync(filePath.fsPath, image, "utf8");
    }
}

interface IPreviewContext {
    readonly webviewPanel: vscode.WebviewPanel;
    readonly updatePreview: () => void;
}

export class PreviewManager {
    private readonly previewDirUri: vscode.Uri;
    private readonly previewContent: string;
    private readonly previewContexts = new WeakMap<vscode.TextDocument, IPreviewContext>();

    public constructor(context: vscode.ExtensionContext, template: string) {
        this.previewDirUri = vscode.Uri.file(context.asAbsolutePath("out/preview"));
        this.previewContent = template.replace(/\{preview-dir\}/g, uriToVscodeResource(this.previewDirUri));
    }

    public async showPreview(editor: vscode.TextEditor): Promise<void> {
        const document = editor.document;
        const context = this.previewContexts.get(document);

        if (context === undefined) {
            this.previewContexts.set(document, await this.createPreview(document, vscode.ViewColumn.Beside));
        } else {
            context.webviewPanel.reveal(undefined, true);
        }
    }

    public async updatePreview(document: vscode.TextDocument): Promise<void> {
        const context = this.previewContexts.get(document);

        if (context !== undefined) {
            context.updatePreview();
        }
    }

    private async createPreview(document: vscode.TextDocument, column: vscode.ViewColumn): Promise<IPreviewContext> {
        const documentDir = path.dirname(document.fileName);
        const documentDirUri = vscode.Uri.file(documentDir);
        const localResourceRoots = [this.previewDirUri, documentDirUri];

        if (vscode.workspace.workspaceFolders) {
            localResourceRoots.push(...vscode.workspace.workspaceFolders.map((f) => f.uri));
        }

        const webviewPanel = vscode.window.createWebviewPanel(
            previewType,
            `Preview: ${document.fileName}`,
            {
                preserveFocus: true,
                viewColumn: column
            },
            {
                enableScripts: true,
                localResourceRoots,
                retainContextWhenHidden: true
            }
        );

        webviewPanel.webview.html = this.previewContent.replace(
            /\{base-url\}/g,
            uriToVscodeResource(documentDirUri)
        );

        // Add bindings.

        const messenger = createMessenger(
            new PreviewPort(webviewPanel.webview),
            async (message) => {
                switch (message.type) {
                    case "export":
                        await exportImage(message.image);
                        break;
                }
            }
        );

        const scheduler = createScheduler(
            (cancel, source: string) => engines.run(source, documentDir, cancel),
            (image) => messenger({
                image,
                type: "success"
            }),
            (error: Error) => messenger({
                message: error.message,
                type: "failure"
            })
        );

        // Add event handlers.

        const updatePreview = () => scheduler(document.getText());

        webviewPanel.onDidDispose(() => this.previewContexts.delete(document));

        webviewPanel.onDidChangeViewState((e) => {
            if (e.webviewPanel.visible) {
                updatePreview();
            }
        });

        // Initialize.

        await messenger({ type: "initialize" });

        updatePreview();

        // Return context.

        return { webviewPanel, updatePreview };
    }
}
