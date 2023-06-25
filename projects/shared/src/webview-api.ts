import type { Image } from "./images";

export const enum WebviewCommand {
    UpdatePreview,
}

// `UpdatePreview` command.

export interface UpdatePreviewSuccessRequest {
    command: WebviewCommand.UpdatePreview;
    success: true;
    images: Image[];
}

export interface UpdatePreviewFailureRequest {
    command: WebviewCommand.UpdatePreview;
    success: false;
    reason: string;
}

export type UpdatePreviewRequest = UpdatePreviewSuccessRequest | UpdatePreviewFailureRequest;
export type UpdatePreviewResponse = void;

// Transmission messages.

export type WebviewRequest = UpdatePreviewRequest;
export type WebviewResponse = UpdatePreviewResponse;
