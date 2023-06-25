export const enum ExtensionCommand {
    SaveImage,
}

export interface SaveImageRequest {
    command: ExtensionCommand.SaveImage;
}

export type ExtensionRequest = SaveImageRequest;

export type ExtensionResponse = void;
