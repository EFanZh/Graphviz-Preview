import * as vscode from "vscode";
import { WorkspaceConfiguration } from "vscode";

export const sectionName = "graphvizPreview";

function getConfiguration(): WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(sectionName);
}

export function getDotPath(): string {
    return getConfiguration().get<string>("dotPath", "dot");
}

export function getDotExtraArgs(): string[] {
    return getConfiguration().get<string[]>("dotExtraArgs", []);
}

export function getEngine(): string {
    return getConfiguration().get<string>("engine", "dot");
}
