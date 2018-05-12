import * as configuration from "../configuration";
import * as dot from "./dot";

function getCurrentEngine(): (source: string, cancel: Promise<void>) => Promise<string> {
    const engineName = configuration.getNullableConfiguration("engine", "dot");

    switch (engineName) {
        case "dot":
            return dot.getEngine();
        default:
            throw new Error(`Unsupported engine: “${engineName}”.`);
    }
}

let currentEngine = getCurrentEngine();

export function getEngine(): (source: string, cancel: Promise<void>) => Promise<string> {
    return (source, cancel) => currentEngine(source, cancel); // Do not use `return currentEngine;`.
}

export function updateConfiguration(): void {
    currentEngine = getCurrentEngine();
}
