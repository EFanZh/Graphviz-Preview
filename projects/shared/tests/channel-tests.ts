import { Channel, ChannelClient, ChannelMessage } from "../src/channel";
import * as assert from "assert";

interface A {
    type: "A";
    value: number;
}

interface B {
    type: "B";
    value: number;
}

interface C {
    type: "C";
    value: number;
}

interface D {
    type: "D";
    value: number;
}

class TestChannel<IncomingRequest, OutgoingResponse, OutgoingRequest, IncomingResponse>
    implements ChannelClient<IncomingRequest, OutgoingResponse, OutgoingRequest>
{
    private readonly channel: Channel<IncomingRequest, OutgoingResponse, OutgoingRequest, IncomingResponse> =
        new Channel();

    public constructor(
        private readonly sender: (data: ChannelMessage<OutgoingRequest, OutgoingResponse>) => void,
        private readonly receiver: (request: IncomingRequest) => Promise<OutgoingResponse>,
    ) {}

    public receiveMessage(message: ChannelMessage<IncomingRequest, IncomingResponse>) {
        this.channel.receiveMessage(this, message);
    }

    public sendRequest(request: OutgoingRequest): Promise<IncomingResponse> {
        return this.channel.sendRequest(this, request);
    }

    // `ChannelClient` interface.

    public send(data: ChannelMessage<OutgoingRequest, OutgoingResponse>): void {
        this.sender(data);
    }

    public receive(request: IncomingRequest): Promise<OutgoingResponse> {
        return this.receiver(request);
    }
}

describe("Channel tests", () => {
    it("Communication tests", async () => {
        const alice: TestChannel<A, B, C, D> = new TestChannel(
            (data) => bob.receiveMessage(data),
            (data) => Promise.resolve({ type: "B", value: data.value * 10 }),
        );

        const bob: TestChannel<C, D, A, B> = new TestChannel(
            (data) => alice.receiveMessage(data),
            (data) => Promise.resolve({ type: "D", value: data.value * 100 }),
        );

        assert.deepStrictEqual(await alice.sendRequest({ type: "C", value: 2 }), { type: "D", value: 200 });
        assert.deepStrictEqual(await alice.sendRequest({ type: "C", value: 3 }), { type: "D", value: 300 });
        assert.deepStrictEqual(await bob.sendRequest({ type: "A", value: 5 }), { type: "B", value: 50 });
        assert.deepStrictEqual(await bob.sendRequest({ type: "A", value: 7 }), { type: "B", value: 70 });
    });

    it("Rejection tests", async () => {
        const alice: TestChannel<A, B, C, D> = new TestChannel(
            (data) => bob.receiveMessage(data),
            (data) => Promise.reject({ type: "B", value: data.value * 10 }),
        );

        const bob: TestChannel<C, D, A, B> = new TestChannel(
            (data) => alice.receiveMessage(data),
            (data) => Promise.reject({ type: "D", value: data.value * 100 }),
        );

        await assert.rejects(alice.sendRequest({ type: "C", value: 2 }), { type: "D", value: 200 });
        await assert.rejects(alice.sendRequest({ type: "C", value: 3 }), { type: "D", value: 300 });
        await assert.rejects(bob.sendRequest({ type: "A", value: 5 }), { type: "B", value: 50 });
        await assert.rejects(bob.sendRequest({ type: "A", value: 7 }), { type: "B", value: 70 });
    });
});
