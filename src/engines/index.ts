import * as configuration from "../configuration";
import * as dot from "./dot";

function getCurrentEngine(): (source: string, workingDir: string, cancel: Promise<void>) => Promise<string> {
    const engineName = configuration.getNullableConfiguration("engine", "dot");

    switch (engineName) {
        case "dot":
            return dot.getEngine();
        default:
            throw new Error(`Unsupported engine: “${engineName}”.`);
    }
}

let currentEngine = getCurrentEngine();

export function run(source: string, workingDir: string, cancel: Promise<void>): Promise<string> {
    return currentEngine(source, workingDir, cancel);
}

export function updateConfiguration(): void {
    currentEngine = getCurrentEngine();
}
