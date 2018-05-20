export interface IMessagePort<TSend, TReceive> {
    send(message: TSend): void;
    onReceive(handler: (message: TReceive) => void): void;
}

interface IRequsetMessage<T> {
    type: "request";
    id: number;
    message: T;
}

interface IResponseSuccessMessage<T> {
    type: "success";
    id: number;
    result: T;
}

interface IResponseFailureMessage {
    type: "failure";
    id: number;
    message: string;
}

type IResponseMessage<T> = IResponseSuccessMessage<T> | IResponseFailureMessage;

export type ISendMessage<TRequest1, TResponse2> = IRequsetMessage<TRequest1> | IResponseMessage<TResponse2>;
export type IReceiveMessage<TResponse1, TRequest2> = IResponseMessage<TResponse1> | IRequsetMessage<TRequest2>;

type Resolver<T> = (value?: T | PromiseLike<T>) => void;
type Rejector = (reason?: any) => void;

export function createMessenger<TRequest1, TResponse1, TRequest2, TResponse2>(
    port: IMessagePort<ISendMessage<TRequest1, TResponse2>, IReceiveMessage<TResponse1, TRequest2>>,
    handler: (message: TRequest2) => Promise<TResponse2>
): (message: TRequest1) => Promise<TResponse1> {
    const maxIds = 2 ** 50;
    const pendingCalls = new Map<number, [Resolver<TResponse1>, Rejector]>();
    let previousId = - 1;

    async function handleRequest(wrappedMessage: IRequsetMessage<TRequest2>): Promise<void> {
        const { id, message } = wrappedMessage;

        try {
            port.send({
                id,
                result: await handler(message),
                type: "success"
            });
        } catch (error) {
            port.send({
                id,
                message: String(error),
                type: "failure"
            });
        }
    }

    async function handleResponse(wrappedMessage: IResponseMessage<TResponse1>): Promise<void> {
        const [resolver, rejector] = pendingCalls.get(wrappedMessage.id)!;

        pendingCalls.delete(wrappedMessage.id);

        if (wrappedMessage.type === "success") {
            resolver(wrappedMessage.result);
        } else {
            rejector(wrappedMessage.message);
        }
    }

    port.onReceive(async (wrappedMessage) => {
        if (wrappedMessage.type === "request") {
            await handleRequest(wrappedMessage);
        } else {
            await handleResponse(wrappedMessage);
        }
    });

    function generateId(): number {
        previousId = (previousId + 1) % maxIds;

        if (pendingCalls.has(previousId)) {
            throw new Error("Well this is unexpected.");
        }

        return previousId;
    }

    async function send(message: TRequest1): Promise<TResponse1> {
        return new Promise<TResponse1>((resolve, reject) => {
            const wrappedMessage: IRequsetMessage<TRequest1> = {
                id: generateId(),
                message,
                type: "request"
            };

            pendingCalls.set(wrappedMessage.id, [resolve, reject]);
            port.send(wrappedMessage);
        });
    }

    return send;
}
