import * as vscode from "vscode";
import * as configuration from "./configuration";
import * as engines from "./engines";
import { PreviewManager } from "./previewManager";
import * as utilities from "./utilities";

const previewCommand = "graphviz.showPreview";

// Extension interfaces.

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    const previewHtml = await utilities.readFileAsync(context.asAbsolutePath("resources/preview.html"), "utf8");
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
        ),
        vscode.workspace.onDidChangeTextDocument((e) => previewManager.updatePreview(e.document)),
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(configuration.sectionName)) {
                engines.updateConfiguration();
            }
        })
    );
}
