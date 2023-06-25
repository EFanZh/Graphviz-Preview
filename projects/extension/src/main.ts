import { PreviewManager } from "./preview-manager";
import { commands, workspace } from "vscode";
import type { ExtensionContext } from "vscode";

const previewCommand = "graphviz.showPreviewToSide";

export async function activate(context: ExtensionContext) {
    const previewManager = await PreviewManager.create(context);

    context.subscriptions.push(
        commands.registerCommand(previewCommand, previewManager.onPreviewCommand.bind(previewManager)),
        workspace.onDidChangeConfiguration(previewManager.onDidChangeConfiguration.bind(previewManager)),
        workspace.onDidChangeTextDocument(previewManager.onDidChangeTextDocument.bind(previewManager)),
        workspace.onDidCloseTextDocument(previewManager.onDidCloseTextDocument.bind(previewManager)),
    );
}
