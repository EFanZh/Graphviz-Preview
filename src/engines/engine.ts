export interface IEngine {
    renderToSvg(source: string, workingDir: string, cancel: Promise<void>): Promise<string>;
    saveToFile(source: string, svgContent: string, filePath: string, workingDir: string): Promise<void>;
}
