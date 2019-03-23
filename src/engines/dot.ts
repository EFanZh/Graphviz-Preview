import * as path from "path";
import * as configuration from "../configuration";
import * as utilities from "../utilities";
import { IEngine } from "./engine";

export function getEngine(): IEngine {
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
            try {
                const [exitCode, stdout, stderr] = await utilities.runChildProcess(
                    dot,
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
                    throw new Error(`Program not found: “${dot}”.\nPlease check your configuration.`);
                } else {
                    throw error;
                }
            }
        },
        saveToFile(source: string, svgContent: string, filePath: string, workingDir: string): Promise<void> {
            const format = getOutputFormat(filePath);

            if (format) {
                if (format === "svg") {
                    return utilities.writeFileAsync(filePath, svgContent);
                } else {
                    return utilities.runChildProcess(
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
