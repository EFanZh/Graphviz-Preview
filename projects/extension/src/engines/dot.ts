import { type Image, ImageType } from "../../../shared/src/images";
import { type Configuration } from "../configurations";
import child_process from "child_process";
import path from "path";
import { window } from "vscode";

const splitRegex = /(?=<\?xml )/;

function concatBuffers(buffers: Buffer[]): string {
    return Buffer.concat(buffers).toString();
}

function parseDocuments(source: string): Image[] {
    const result = [];

    for (const data of source.split(splitRegex)) {
        if (data.startsWith("<?xml ")) {
            result.push({ type: ImageType.Svg, data });
        }
    }

    return result;
}

export function render(
    configuration: Configuration,
    cwd: string,
    source: string,
    onCancel: (cancelFn: () => void) => void,
): Promise<Image[]> {
    const dotPath = configuration.dotPath;
    const dotExtraArgs = configuration.dotExtraArgs;

    return new Promise((resolve, reject) => {
        // Configure output buffers.

        const stdoutBuffers: Buffer[] = [];
        const stderrBuffers: Buffer[] = [];

        const getError = () => new Error(concatBuffers(stderrBuffers));
        const resolveWithStdout = () => resolve(parseDocuments(concatBuffers(stdoutBuffers)));
        const rejectWithStderr = () => reject(getError());
        const rejectWithError = (error: Error) => reject(stderrBuffers.length === 0 ? error : getError());

        // Configure process event handlers.

        const process = child_process.spawn(dotPath, ["-T", "svg", ...dotExtraArgs], { cwd });

        onCancel(process.kill.bind(process));

        process.on("error", rejectWithError);

        process.on("exit", (code) => {
            const [output, handler] = code === 0 ? [stdout, resolveWithStdout] : [stderr, rejectWithStderr];

            if (output.closed) {
                handler();
            } else {
                output.on("close", handler);
            }
        });

        // Configure stream event handlers.

        const { stderr, stdout } = process;

        stdout.on("data", stdoutBuffers.push.bind(stdoutBuffers));
        stdout.on("error", rejectWithError);

        stderr.on("data", stderrBuffers.push.bind(stderrBuffers));
        stderr.on("error", rejectWithError);

        // Begin to feed data to the process.

        process.stdin.end(source);
    });
}

function getOutputFormat(extension: string): string {
    switch (extension) {
        case ".pdf":
            return "pdf";
        case ".png":
            return "png";
        case ".svg":
            return "svg";
        default:
            throw new Error(`Unsupported extension: ${extension}.`);
    }
}

export async function save(configuration: Configuration, cwd: string, source: string): Promise<void> {
    const outputPath = (
        await window.showSaveDialog({
            filters: {
                "PDF File": ["pdf"],
                "PNG Image": ["png"],
                "SVG Image": ["svg"],
            },
        })
    )?.fsPath;

    if (outputPath !== undefined) {
        const format = getOutputFormat(path.extname(outputPath).toLowerCase());

        await new Promise((resolve, reject) => {
            const stderrBuffers: Buffer[] = [];

            const process = child_process.spawn(
                configuration.dotPath,
                ["-T", format, "-o", outputPath, ...configuration.dotExtraArgs],
                { cwd },
            );

            process.stderr.on("data", stderrBuffers.push.bind(stderrBuffers));
            process.on("error", reject);

            process.on("exit", (code) => {
                if (code === 0) {
                    resolve(undefined);
                } else {
                    reject(new Error(concatBuffers(stderrBuffers)));
                }
            });

            process.stdin.end(source);
        });
    }
}
