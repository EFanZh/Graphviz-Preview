import * as path from "path";

import { runTests } from "vscode-test";

async function main(): Promise<void> {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, "../../");
        const extensionTestsPath = path.resolve(__dirname, "./suite/index");

        await runTests({ extensionDevelopmentPath, extensionTestsPath });
    } catch (err) {
        process.exit(1);
    }
}

main();
