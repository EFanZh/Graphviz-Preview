import * as path from "path";
import * as vscode from "vscode";
import * as configuration from "../configuration";
import * as nodeUtilities from "../nodeUtilities";
import { Engine } from "./engine";

function normalizeDotExecutable(dot: string, workingDir: string): string {
    if (path.basename(dot) == dot) {
        return dot;
    } else {
        const workspaceFolders = vscode.workspace.workspaceFolders;

        return path.resolve(workspaceFolders === undefined ? workingDir : workspaceFolders[0].uri.fsPath, dot);
    }
}

export function getEngine(): Engine {
    const dot = configuration.getNullableConfiguration<string>("dotPath", "dot");
    const args = ["-T", "svg"];

    const imageFormatMap: { [key: string]: string | undefined } = {
        ".PDF": "pdf",
        ".PNG": "png",
        ".SVG": "svg"
    };

    function getOutputFormat(filePath: string): string | undefined {
        return imageFormatMap[path.extname(filePath).toUpperCase()];
    }

    return Object.freeze({
        async renderToSvg(source: string, workingDir: string, cancel: Promise<void>): Promise<string> {
            const normalizedDot = normalizeDotExecutable(dot, workingDir);

            try {
                const [exitCode, stdout, stderr] = await nodeUtilities.runChildProcess(
                    normalizedDot,
                    args,
                    workingDir,
                    source,
                    cancel
                );

                if (exitCode === 0) {
                    return stdout;
                } else {
                    throw new Error(stderr.trim());
                }
            } catch (error) {
                if (error.code === "ENOENT") {
                    throw new Error(`Program not found: “${normalizedDot}”.\nPlease check your configuration.`);
                } else {
                    throw error;
                }
            }
        },
        saveToFile(source: string, svgContent: string, filePath: string, workingDir: string): Promise<void> {
            const format = getOutputFormat(filePath);

            if (format) {
                if (format === "svg") {
                    return nodeUtilities.writeFileAsync(filePath, svgContent);
                } else {
                    return nodeUtilities.runChildProcess(
                        dot,
                        ["-T", format, "-o", filePath],
                        workingDir,
                        source
                    ).then((value) => {
                        const [exitCode, , stderr] = value;

                        if (exitCode !== 0) {
                            throw new Error(stderr.trim());
                        }
                    });
                }
            } else {
                return Promise.reject(new Error("Unsupported output format."));
            }
        }
    });
}
