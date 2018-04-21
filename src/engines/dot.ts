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

export function getEngine(): (source: string) => Promise<string> {
    const dot = getDotProgram();
    const args = ["-T", "svg"];

    async function compile(source: string): Promise<string> {
        try {
            const [exitCode, stdout, stderr] = await utilities.runChildProcess(dot, args, source);

            if (exitCode === 0) {
                return stdout;
            } else {
                throw new Error(stderr.trim());
            }
        } catch (error) {
            if (error.code === "ENOENT") {
                throw new Error(`Program not found: “${dot}”.\nPlease check your configuration.`);
            } else {
                throw error;
            }
        }
    }

    return compile;
}
