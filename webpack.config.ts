import * as path from "path";
import type { Configuration } from "webpack";

const baseConfig: Configuration = {
    mode: "none",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].js",
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: "ts-loader",
                    },
                ],
            },
        ],
    },
    resolve: {
        extensions: [".ts"],
    },
    devtool: "nosources-source-map",
    infrastructureLogging: {
        level: "log",
    },
};

const extensionConfig: Configuration = {
    ...baseConfig,
    entry: {
        extension: "./projects/extension/src/main.ts",
    },
    output: {
        ...baseConfig.output,
        library: {
            type: "commonjs2",
        },
    },
    target: "node",
    externals: {
        vscode: "commonjs vscode",
    },
};

const previewConfig: Configuration = {
    ...baseConfig,
    entry: {
        webview: "./projects/webview/src/main.ts",
    },
};

module.exports = [extensionConfig, previewConfig];
