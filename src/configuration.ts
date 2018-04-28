import * as vscode from "vscode";

export const sectionName = "graphvizPreview";

export function getNullableConfiguration<T>(name: string, defaultValue: T): T {
    const configuration = vscode.workspace.getConfiguration(sectionName);
    const value = configuration.get<null | T>(name);

    return value ? value : defaultValue;
}
