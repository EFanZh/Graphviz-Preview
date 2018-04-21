import * as vscode from "vscode";
import { PreviewManager } from "./previewManager";
import * as utilities from "./utilities";

const previewCommand = "graphviz.showPreview";

// Extension interfaces.

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    const previewHtml = await utilities.readFileAsync(context.asAbsolutePath("src/preview/preview.html"), "utf8");
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
