import * as configuration from "../configuration";
import * as dot from "./dot";
import { Engine } from "./engine";

function getCurrentEngine(): Engine {
    const engine = configuration.getEngine();

    switch (engine) {
        case "dot":
            return dot.getEngine();
        default:
            throw new Error(`Unsupported engine: “${engine}”.`);
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
