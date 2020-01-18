import { ControllerArchive } from "./preview/controller";

export interface AppArchive {
    image: string;
    status: string | null;
    controller: ControllerArchive;
}

export interface InitializeRequest {
    type: "initialize";
}

export interface UpdateRequest {
    type: "success";
    image: string;
}

export interface ErrorRequest {
    type: "failure";
    message: string;
}

export interface SerializeRequest {
    type: "serialize";
}

export interface SerializeResponse {
    type: "serializeResponse";
    result: AppArchive;
}

export interface RestoreRequest {
    type: "restore";
    archive: AppArchive;
}

export type PreviewRequest = InitializeRequest | UpdateRequest | ErrorRequest | SerializeRequest | RestoreRequest;
export type PreviewResponse = SerializeResponse | undefined;

export interface ExportRequest {
    type: "export";
    image: string;
}

export type ExtensionRequest = ExportRequest;
export type ExtensionResponse = void;
