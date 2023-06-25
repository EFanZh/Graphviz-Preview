// Message wrapped with a task ID.
import { IdGenerator } from "./id-generator";

export interface MessageTask<T> {
    taskId: number;
    data: T;
}

// Response type.

export const enum ResponseType {
    Resolve,
    Reject,
}

export interface ResolveResponse<T> {
    type: ResponseType.Resolve;
    value: T;
}

export interface RejectResponse {
    type: ResponseType.Reject;
    reason: unknown;
}

export type Response<T> = ResolveResponse<T> | RejectResponse;

// Message types for transferring.

export const enum MessageType {
    Request,
    Response,
}

export interface RequestMessage<T> {
    type: MessageType.Request;
    data: MessageTask<T>;
}

export interface ResponseMessage<T> {
    type: MessageType.Response;
    data: MessageTask<Response<T>>;
}

export type ChannelMessage<T, U> = RequestMessage<T> | ResponseMessage<U>;

export interface ChannelSender<OutgoingResponse, OutgoingRequest> {
    send(data: ChannelMessage<OutgoingRequest, OutgoingResponse>): void;
}

export interface ChannelReceiver<IncomingRequest, OutgoingResponse> {
    receive(request: IncomingRequest): Promise<OutgoingResponse>;
}

export interface ChannelClient<IncomingRequest, OutgoingResponse, OutgoingRequest>
    extends ChannelSender<OutgoingResponse, OutgoingRequest>,
        ChannelReceiver<IncomingRequest, OutgoingResponse> {}

export class Channel<IncomingRequest, OutgoingResponse, OutgoingRequest, IncomingResponse> {
    private readonly pendingTasks = new Map<
        number,
        [(response: IncomingResponse) => void, (reason: unknown) => void]
    >();

    private readonly idGenerator = new IdGenerator();

    private receiveRequest(
        client: ChannelClient<IncomingRequest, OutgoingResponse, OutgoingRequest>,
        request: MessageTask<IncomingRequest>,
    ) {
        const { taskId, data } = request;
        const sendResponse = this.sendResponse.bind(this, client, taskId);

        client.receive(data).then(
            (value) => sendResponse({ type: ResponseType.Resolve, value }),
            (reason) => sendResponse({ type: ResponseType.Reject, reason }),
        );
    }

    private receiveResponse(response: MessageTask<Response<IncomingResponse>>) {
        const actions = this.pendingTasks.get(response.taskId);

        if (actions !== undefined) {
            this.pendingTasks.delete(response.taskId);

            const data = response.data;

            switch (data.type) {
                case ResponseType.Resolve:
                    actions[0](data.value);

                    break;
                case ResponseType.Reject:
                    actions[1](data.reason);

                    break;
            }
        }
    }

    public receiveMessage(
        client: ChannelClient<IncomingRequest, OutgoingResponse, OutgoingRequest>,
        message: ChannelMessage<IncomingRequest, IncomingResponse>,
    ) {
        switch (message.type) {
            case MessageType.Request:
                this.receiveRequest(client, message.data);

                break;
            case MessageType.Response:
                this.receiveResponse(message.data);

                break;
        }
    }

    public sendRequest(
        sender: ChannelSender<OutgoingResponse, OutgoingRequest>,
        request: OutgoingRequest,
    ): Promise<IncomingResponse> {
        return new Promise((resolve, reject) => {
            const taskId = this.idGenerator.next();

            this.pendingTasks.set(taskId, [resolve, reject]);

            sender.send({
                type: MessageType.Request,
                data: {
                    taskId,
                    data: request,
                },
            });
        });
    }

    private sendResponse(
        sender: ChannelSender<OutgoingResponse, OutgoingRequest>,
        taskId: number,
        response: Response<OutgoingResponse>,
    ) {
        sender.send({
            type: MessageType.Response,
            data: {
                taskId,
                data: response,
            },
        });
    }
}
