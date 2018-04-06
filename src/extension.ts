"use strict";

import * as child_process from "child_process";
import * as fs from "fs";
import * as vscode from "vscode";

const extensionId = "graphviz-preview";
const previewCommand = "graphviz.showPreview";

// Utility functions.

function readFileAsync(path: string): Promise<string> {
    return new Promise((resolve) => fs.readFile(path, "utf8", (_, data) => resolve(data)));
}

function getDotProgram(): string {
    const configuration = vscode.workspace.getConfiguration(extensionId);
    const dotPath = configuration.get<null | string>("dotPath");

    if (dotPath === undefined || dotPath === null) {
        return "dot";
    } else {
        return dotPath;
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

function runChildProcess(program: string, args: string[], input: string): Promise<[number, string, string]> {
    return new Promise((resolve, reject) => {
        const process = child_process.spawn(program, args);
        const stdoutBuffer: Array<(string | Buffer)> = [];
        const stderrBuffer: Array<(string | Buffer)> = [];

        process.on("error", reject);
        process.on("exit", (code) => resolve([code, stdoutBuffer.join(), stderrBuffer.join()]));
        process.stdout.on("data", (chunk) => stdoutBuffer.push(chunk));
        process.stderr.on("data", (chunk) => stderrBuffer.push(chunk));
        process.stdin.end(input);
    });
}

export interface IUpdateMessage {
    type: "success";
    image: string;
}

export interface IErrorMessage {
    type: "failure";
    message: any;
}

export type PreviewMessage = IUpdateMessage | IErrorMessage;

type MyWebView = any;

class PreviewManager {
    private static async compileSource(source: string): Promise<string> {
        const [exitCode, stdout, stderr] = await runChildProcess(getDotProgram(), ["-T", "svg"], source);

        if (exitCode === 0) {
            return stdout;
        } else {
            throw stderr;
        }
    }

    private static postMessageToPreview(preview: MyWebView, message: PreviewMessage): Thenable<boolean> {
        return preview.postMessage(message);
    }

    private static makeTitle(document: vscode.TextDocument): string {
        return `Preview: ${document.fileName}`;
    }

    private static async updatePreviewContent(
        preview: MyWebView,
        document: vscode.TextDocument
    ): Promise<boolean> {
        preview.title = this.makeTitle(document);

        try {
            return this.postMessageToPreview(
                preview,
                {
                    image: await this.compileSource(document.getText()),
                    type: "success"
                }
            );
        } catch (error) {
            return this.postMessageToPreview(
                preview,
                {
                    message: error,
                    type: "failure"
                }
            );
        }
    }

    private readonly previews = new WeakMap<vscode.TextDocument, MyWebView>();
    private readonly previewContent: string;
    private readonly resourceRoots: vscode.Uri[];

    public constructor(context: vscode.ExtensionContext, template: string) {
        const previewDirUri = vscode.Uri.file(context.asAbsolutePath("out/preview"));

        this.previewContent = template.replace(
            /\{preview-dir\}/g,
            previewDirUri.with({ scheme: "vscode-resource" }).toString(true)
        );

        this.resourceRoots = [previewDirUri];
    }

    public async showPreview(editor: vscode.TextEditor): Promise<void> {
        const document = editor.document;

        let result = this.previews.get(document);

        if (result === undefined) {
            result = await this.createPreview(getPreviewColumn(editor.viewColumn), document);

            this.previews.set(document, result);

            result.onDidDispose(() => this.previews.delete(document));
        } else {
            result.reveal(result.viewColumn || getPreviewColumn(editor.viewColumn));
        }
    }

    public async updatePreview(document: vscode.TextDocument): Promise<void> {
        const preview = this.previews.get(document);

        if (preview !== undefined) {
            await PreviewManager.updatePreviewContent(preview, document);
        }
    }

    private async createPreview(column: vscode.ViewColumn, document: vscode.TextDocument): Promise<MyWebView> {
        const result = (vscode.window as any).createWebview(
            "",
            PreviewManager.makeTitle(document),
            column,
            {
                enableScripts: true,
                localResourceRoots: this.resourceRoots
            }
        );

        const nonce = new Date().getTime() + "" + new Date().getMilliseconds();

        result.html = this.previewContent.replace(/\{nonce\}/g, nonce);

        await PreviewManager.updatePreviewContent(result, document);

        return result;
    }
}

// Extension interfaces.

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    const previewHtml = await readFileAsync(context.asAbsolutePath("src/preview/preview.html"));
    const previewManager = new PreviewManager(context, previewHtml);

    context.subscriptions.push(
        vscode.commands.registerCommand(
            previewCommand,
            () => {
                const activeTextEditor = vscode.window.activeTextEditor;

                if (activeTextEditor !== undefined) {
                    previewManager.showPreview(activeTextEditor);
                }
            }
        )
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((e) => previewManager.updatePreview(e.document))
    );
}
