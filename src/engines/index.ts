import * as configuration from "../configuration";
import * as dot from "./dot";
import { Engine } from "./engine";

function getCurrentEngine(): Engine {
    const engineName = configuration.getNullableConfiguration("engine", "dot");

    switch (engineName) {
        case "dot":
            return dot.getEngine();
        default:
            throw new Error(`Unsupported engine: “${engineName}”.`);
    }
}

let currentEngineInstance = getCurrentEngine();

export const currentEngine: Engine = Object.freeze({
    renderToSvg(source: string, workingDir: string, cancel: Promise<void>): Promise<string> {
        return currentEngineInstance.renderToSvg(source, workingDir, cancel);
    },

    saveToFile(source: string, svgContent: string, filePath: string, workingDir: string): Promise<void> {
        return currentEngineInstance.saveToFile(source, svgContent, filePath, workingDir);
    }
});

export function updateConfiguration(): void {
    currentEngineInstance = getCurrentEngine();
}
