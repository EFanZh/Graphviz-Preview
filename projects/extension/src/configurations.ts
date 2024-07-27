import { Engine } from "./engines";
import * as dot from "./engines/dot";
import { WorkspaceConfiguration, window, workspace } from "vscode";

function getDotPath(configuration: WorkspaceConfiguration): string {
    let dotPath = configuration.get("graphvizPreview.dotPath", "dot");

    if (dotPath.includes("${workspaceFolder}") && window.activeTextEditor) {
        let workspaceFolder = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri);
        let workspaceFolderPath = workspaceFolder?.uri.fsPath || "";
        dotPath = dotPath.replace("${workspaceFolder}", workspaceFolderPath);
    }

    return dotPath
}

function getDotExtraArgs(configuration: WorkspaceConfiguration): string[] {
    return configuration.get("graphvizPreview.dotExtraArgs", []);
}

function getEngine(configuration: WorkspaceConfiguration): Engine {
    switch (configuration.get("graphvizPreview.engine")) {
        case "dot":
            return dot;
        default:
            return dot;
    }
}

export class Configuration {
    public constructor(
        public readonly dotPath: string,
        public readonly dotExtraArgs: string[],
        public readonly engine: Engine,
    ) { }

    public static fromWorkspaceConfiguration(configuration: WorkspaceConfiguration): Configuration {
        const dotPath = getDotPath(configuration);
        const dotExtraArgs = getDotExtraArgs(configuration);
        const engine = getEngine(configuration);

        return new Configuration(dotPath, dotExtraArgs, engine);
    }
}
