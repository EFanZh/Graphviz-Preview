import * as child_process from "child_process";
import * as fs from "fs";
import * as util from "util";

export const readFileAsync = util.promisify(fs.readFile);
export const writeFileAsync = util.promisify(fs.writeFile);

function joinBuffers(buffers: Uint8Array[]): string {
    return Buffer.concat(buffers).toString();
}

export function runChildProcess(
    program: string,
    args: string[],
    cwd: string,
    input: string,
    cancel?: Promise<void>
): Promise<[number | null, string, string]> {
    return new Promise((resolve, reject) => {
        const process = child_process.spawn(program, args, { cwd });
        const stdoutBuffer: Buffer[] = [];
        const stderrBuffer: Buffer[] = [];

        process.on("error", reject);
        process.on("exit", (code) => resolve([code, joinBuffers(stdoutBuffer), joinBuffers(stderrBuffer)]));
        process.stdout.on("data", (chunk) => stdoutBuffer.push(chunk));
        process.stderr.on("data", (chunk) => stderrBuffer.push(chunk));

        if (cancel) {
            cancel.then(() => process.kill());
        }

        try {
            process.stdin.end(input);
        } catch (error) {
            // Ignored.
        }
    });
}
