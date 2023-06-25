import { Image, ImageType } from "../../../shared/src/images";
import { Configuration } from "../configurations";
import * as child_process from "child_process";
import * as path from "path";
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
        const stdoutBuffers: Buffer[] = [];
        const stderrBuffers: Buffer[] = [];
        const process = child_process.spawn(dotPath, ["-T", "svg", ...dotExtraArgs], { cwd });

        onCancel(process.kill.bind(process));

        process.stdout.on("data", stdoutBuffers.push.bind(stdoutBuffers));
        process.stderr.on("data", stderrBuffers.push.bind(stderrBuffers));
        process.on("error", reject);

        process.on("exit", (code) => {
            if (code === 0) {
                resolve(parseDocuments(concatBuffers(stdoutBuffers)));
            } else {
                reject(new Error(concatBuffers(stderrBuffers)));
            }
        });

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
