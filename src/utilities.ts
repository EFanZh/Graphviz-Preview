import * as child_process from "child_process";
import * as fs from "fs";
// import * as util from "util";

// export const readFileAsync = util.promisify(fs.readFile);
// export const writeFileAsync = util.promisify(fs.writeFile);

export async function readFileAsync(path: string, options: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        fs.readFile(path, options, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

export async function writeFileAsync(path: string, data: string, options: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fs.writeFile(path, data, options, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

export function runChildProcess(program: string, args: string[], input: string): Promise<[number, string, string]> {
    return new Promise((resolve, reject) => {
        const process = child_process.spawn(program, args);
        const stdoutBuffer: Array<(string | Buffer)> = [];
        const stderrBuffer: Array<(string | Buffer)> = [];

        process.on("error", reject);
        process.on("exit", (code) => resolve([code, stdoutBuffer.join(""), stderrBuffer.join("")]));
        process.stdout.on("data", (chunk) => stdoutBuffer.push(chunk));
        process.stderr.on("data", (chunk) => stderrBuffer.push(chunk));

        try {
            process.stdin.end(input);
        } catch (error) {
            // Ignored.
        }
    });
}
