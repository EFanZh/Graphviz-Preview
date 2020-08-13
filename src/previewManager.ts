import * as crypto from "crypto";
import * as path from "path";
import * as vscode from "vscode";
import * as engines from "./engines";
import { ExtensionRequest, ExtensionResponse, PreviewRequest, PreviewResponse } from "./messages";
import { createMessenger, MessagePort, ReceiveMessage, SendMessage } from "./messenger";
import { createScheduler } from "./scheduler";

const previewType = "graphviz.preview";

class PreviewPort implements
    MessagePort<SendMessage<PreviewRequest, ExtensionResponse>, ReceiveMessage<PreviewResponse, ExtensionRequest>> {
    public constructor(private readonly view: vscode.Webview) {
    }

    public send(message: SendMessage<PreviewRequest, ExtensionResponse>): void {
        this.view.postMessage(message);
    }

    public onReceive(handler: (message: ReceiveMessage<PreviewResponse, ExtensionRequest>) => void): void {
        this.view.onDidReceiveMessage(handler);
    }
}

interface PreviewContext {
    readonly webviewPanel: vscode.WebviewPanel;
    readonly updatePreview: () => void;
}

export class PreviewManager {
    private readonly previewDirUri: vscode.Uri;
    private readonly previewContent: string;
    private readonly previewContexts = new WeakMap<vscode.TextDocument, PreviewContext>();

    public constructor(context: vscode.ExtensionContext, template: string) {
        this.previewDirUri = vscode.Uri.file(context.asAbsolutePath("out/preview"));
        this.previewContent = template;
    }

    public async showPreviewToSide(editor: vscode.TextEditor): Promise<void> {
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

    private async exportImage(
        source: string,
        svgContent: string,
        workingDir: string
    ): Promise<void> {
        const filePath = await vscode.window.showSaveDialog({
            filters: { "PDF": ["pdf"], "PNG Image": ["png"], "SVG Image": ["svg"] }
        });

        if (filePath) {
            await engines.currentEngine.saveToFile(source, svgContent, filePath.fsPath, workingDir);
        }
    }

    private getPreviewHtml(webview: vscode.Webview, baseUrl: vscode.Uri, nonce: string): string {
        let previewHtml = this.previewContent.replace(/\{base-url\}/g, webview.asWebviewUri(baseUrl).toString());

        previewHtml = previewHtml.replace(/\{preview-dir\}/g, webview.asWebviewUri(this.previewDirUri).toString());
        previewHtml = previewHtml.replace(/\{csp-source\}/g, webview.cspSource);
        previewHtml = previewHtml.replace(/\{nonce\}/g, nonce);

        return previewHtml;
    }

    private async createPreview(document: vscode.TextDocument, column: vscode.ViewColumn): Promise<PreviewContext> {
        const documentDir = path.dirname(document.fileName);
        const documentDirUri = vscode.Uri.file(documentDir);
        const localResourceRoots = [this.previewDirUri, documentDirUri];

        if (vscode.workspace.workspaceFolders) {
            localResourceRoots.push(...vscode.workspace.workspaceFolders.map((f) => f.uri));
        }

        const webviewPanel = vscode.window.createWebviewPanel(
            previewType,
            `Preview: ${path.basename(document.fileName)}`,
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

        webviewPanel.webview.html = this.getPreviewHtml(
            webviewPanel.webview,
            documentDirUri,
            crypto.randomBytes(32).toString("hex")
        );

        // Add bindings.

        const messenger = createMessenger(
            new PreviewPort(webviewPanel.webview),
            async (message) => {
                switch (message.type) {
                    case "export":
                        try {
                            await this.exportImage(document.getText(), message.image, documentDir);
                        } catch (error) {
                            await vscode.window.showErrorMessage(error.message);
                        }

                        break;
                }
            }
        );

        const scheduler = createScheduler(
            (cancel, source: string) => engines.currentEngine.renderToSvg(source, documentDir, cancel),
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

        const updatePreview = (): void => scheduler(document.getText());

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
