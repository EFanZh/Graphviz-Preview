import * as child_process from "child_process";
import * as fs from "fs";
import * as vscode from "vscode";

const extensionId = "graphviz-preview";

export function readFileAsync(path: string): Promise<string> {
    return new Promise(
        (resolve, reject) => fs.readFile(path, "utf8", (err, data) => err ? reject(err) : resolve(data))
    );
}

export function writeFileAsync(path: string, text: string): Promise<void> {
    return new Promise((resolve, reject) => fs.writeFile(path, text, "utf8", (err) => err ? reject(err) : resolve()));
}

export function getDotProgram(): string {
    const configuration = vscode.workspace.getConfiguration(extensionId);
    const dotPath = configuration.get<null | string>("dotPath");

    if (dotPath === undefined || dotPath === null) {
        return "dot";
    } else {
        return dotPath;
    }
}

export function runChildProcess(program: string, args: string[], input: string): Promise<[number, string, string]> {
    return new Promise((resolve, reject) => {
        const process = child_process.spawn(program, args);
        const stdoutBuffer: Array<(string | Buffer)> = [];
        const stderrBuffer: Array<(string | Buffer)> = [];

        process.on("error", reject);
        process.on("exit", (code) => resolve([code, stdoutBuffer.join(), stderrBuffer.join()]));
        process.stdout.on("data", (chunk) => stdoutBuffer.push(chunk));
        process.stderr.on("data", (chunk) => stderrBuffer.push(chunk));
        process.stdin.end(input);
    });
}
