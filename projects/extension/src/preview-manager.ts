import { Configuration } from "./configurations";
import { PreviewState } from "./preview-state";
import * as fs from "fs/promises";
import * as path from "path";
import type { ExtensionContext, TextDocument, TextDocumentChangeEvent } from "vscode";
import { window, workspace } from "vscode";

export class Context {
    public constructor(
        public readonly extensionContext: ExtensionContext,
        public configuration: Configuration,
        public readonly webviewTemplate: string,
    ) {}
}

export class PreviewManager {
    private readonly previewStates: WeakMap<TextDocument, PreviewState> = new WeakMap();

    public constructor(private readonly context: Context) {}

    public static async create(extensionContext: ExtensionContext): Promise<PreviewManager> {
        const configuration = Configuration.fromWorkspaceConfiguration(workspace.getConfiguration());

        const webviewTemplate = await fs.readFile(
            path.join(extensionContext.extensionPath, "resources", "webview.html"),
            "utf-8",
        );

        return new PreviewManager(new Context(extensionContext, configuration, webviewTemplate));
    }

    private getOrCreatePreviewState(document: TextDocument): PreviewState {
        let previewState = this.previewStates.get(document);

        if (previewState === undefined) {
            previewState = PreviewState.create(
                this.context,
                document,
                this.previewStates.delete.bind(this.previewStates, document),
            );

            this.previewStates.set(document, previewState);
        }

        return previewState;
    }

    // =============================================== System events ================================================ //

    // `PreviewCommand` event.

    public onPreviewCommand() {
        const document = window.activeTextEditor?.document;

        if (document !== undefined) {
            this.getOrCreatePreviewState(document)?.onPreviewCommand();
        }
    }

    // `DidChangeConfiguration` event.

    public onDidChangeConfiguration() {
        this.context.configuration = Configuration.fromWorkspaceConfiguration(workspace.getConfiguration());
    }

    // `DidChangeTextDocument` event.

    public onDidChangeTextDocument(e: TextDocumentChangeEvent) {
        this.previewStates.get(e.document)?.onDidChangeTextDocument();
    }

    // `DidCloseTextDocument` event.

    public onDidCloseTextDocument(e: TextDocument) {
        this.previewStates.delete(e);
    }
}
