import { type Configuration } from "webpack";
import path from "path";

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

const webviewConfig: Configuration = {
    ...baseConfig,
    entry: {
        webview: "./projects/webview/src/main.ts",
    },
    devtool: "inline-source-map",
};

module.exports = [extensionConfig, webviewConfig];
