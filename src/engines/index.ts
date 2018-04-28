import * as configuration from "../configuration";
import * as dot from "./dot";

function getCurrentEngine(): (source: string) => Promise<string> {
    const engineName = configuration.getNullableConfiguration("engine", "dot");

    switch (engineName) {
        case "dot":
            return dot.getEngine();
        default:
            throw new Error(`Unsupported engine: “${engineName}”.`);
    }
}

let currentEngine = getCurrentEngine();

export function getEngine(): (source: string) => Promise<string> {
    return (source) => currentEngine(source); // Do not use `return currentEngine;`.
}

export function updateConfiguration(): void {
    currentEngine = getCurrentEngine();
}
