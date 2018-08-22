import * as child_process from "child_process";
import * as fs from "fs";
import * as util from "util";

export const readFileAsync = util.promisify(fs.readFile);
export const writeFileAsync = util.promisify(fs.writeFile);

export function runChildProcess(
    program: string,
    args: string[],
    cwd: string,
    input: string,
    cancel: Promise<void>
): Promise<[number, string, string]> {
    return new Promise((resolve, reject) => {
        const process = child_process.spawn(program, args, { cwd });
        const stdoutBuffer: Array<(string | Buffer)> = [];
        const stderrBuffer: Array<(string | Buffer)> = [];

        process.on("error", reject);
        process.on("exit", (code) => resolve([code, stdoutBuffer.join(""), stderrBuffer.join("")]));
        process.stdout.on("data", (chunk) => stdoutBuffer.push(chunk));
        process.stderr.on("data", (chunk) => stderrBuffer.push(chunk));

        cancel.then(() => process.kill());

        try {
            process.stdin.end(input);
        } catch (error) {
            // Ignored.
        }
    });
}
