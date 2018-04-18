import * as vscode from "vscode";
import * as utilities from "../utilities";

function getDotProgram(): string {
    const configuration = vscode.workspace.getConfiguration(utilities.extensionId);
    const dotPath = configuration.get<null | string>("dotPath");

    if (dotPath === undefined || dotPath === null) {
        return "dot";
    } else {
        return dotPath;
    }
}

export async function compile(source: string): Promise<string> {
    const dotProgram = getDotProgram();
    const [exitCode, stdout, stderr] = await utilities.runChildProcess(dotProgram, ["-T", "svg"], source);

    if (exitCode === 0) {
        return stdout;
    } else {
        throw stderr;
    }
}
