import { Engine } from "./engines";
import * as dot from "./engines/dot";
import * as utilities from "./utilities";
import { TextDocument, workspace, WorkspaceConfiguration } from "vscode";

function getDotPath(configuration: WorkspaceConfiguration): string {
    return String(configuration.get("graphvizPreview.dotPath", "dot"));
}

function getDotExtraArgs(configuration: WorkspaceConfiguration): string[] {
    return configuration.get("graphvizPreview.dotExtraArgs", []).map(String);
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
    private constructor(
        public readonly dotPath: string,
        public readonly dotExtraArgs: string[],
        public readonly engine: Engine,
    ) {}

    public static fromWorkspaceConfiguration(configuration: WorkspaceConfiguration): Configuration {
        const dotPath = getDotPath(configuration);
        const dotExtraArgs = getDotExtraArgs(configuration);
        const engine = getEngine(configuration);

        return new Configuration(dotPath, dotExtraArgs, engine);
    }

    // TODO: Use a new type for resolved configuration?
    public resolve(document: TextDocument): Configuration {
        const resolve = (s: string) =>
            utilities.resolveVariables(s, (key) => {
                switch (key) {
                    case "workspaceFolder": {
                        return workspace.getWorkspaceFolder(document.uri)?.uri?.fsPath;
                    }
                }

                return undefined;
            });

        return new Configuration(resolve(this.dotPath), this.dotExtraArgs.map(resolve), this.engine);
    }
}
