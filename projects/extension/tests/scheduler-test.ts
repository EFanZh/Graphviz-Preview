import { Scheduler } from "../src/scheduler";
import * as utilities from "../src/utilities";
import * as assert from "assert";

const enum EventType {
    Resolve,
    Reject,
    StartRunning,
    Cancel,
}

interface ResolveEvent {
    type: EventType.Resolve;
    id: string;
    value: number;
}

interface RejectEvent {
    type: EventType.Reject;
    id: string;
    reason: unknown;
}

interface StartRunningEvent {
    type: EventType.StartRunning;
    id: string;
}

interface CancelEvent {
    type: EventType.Cancel;
    id: string;
}

type SchedulerEvent = ResolveEvent | RejectEvent | StartRunningEvent | CancelEvent;

class TestScheduler {
    private scheduler: Scheduler;
    private events_: SchedulerEvent[] = [];

    public constructor(maxRunningTasks: number) {
        this.scheduler = new Scheduler(maxRunningTasks);
    }

    public schedule(id: string): [Promise<number>, (value: number) => void, (reason: number) => void] {
        const events = this.events_;
        const result = utilities.createPromise<number>();
        const promise = result[0];

        this.scheduler.schedule(
            (onCancel) => {
                events.push({ type: EventType.StartRunning, id });
                onCancel(() => events.push({ type: EventType.Cancel, id }));

                return promise;
            },
            (value) => events.push({ type: EventType.Resolve, id, value }),
            (reason) => events.push({ type: EventType.Reject, id, reason }),
        );

        return result;
    }

    public get events(): ReadonlyArray<SchedulerEvent> {
        return this.events_;
    }

    public get lastEvent(): SchedulerEvent | undefined {
        return this.events_.at(-1);
    }
}

describe("Scheduler tests", () => {
    it("Run if possible", async () => {
        const scheduler = new TestScheduler(2);

        assert.strictEqual(scheduler.events.length, 0);

        // Schedule first task.

        const [promise_0, resolve_0] = scheduler.schedule("first");

        assert.strictEqual(scheduler.events.length, 1);
        assert.deepStrictEqual(scheduler.lastEvent, { type: EventType.StartRunning, id: "first" });

        // Schedule second task.

        scheduler.schedule("second");

        assert.strictEqual(scheduler.events.length, 2);
        assert.deepStrictEqual(scheduler.lastEvent, { type: EventType.StartRunning, id: "second" });

        // Finish first task.

        resolve_0(7);
        assert.strictEqual(await promise_0, 7);
        assert.strictEqual(scheduler.events.length, 3);
        assert.deepStrictEqual(scheduler.lastEvent, { type: EventType.Resolve, id: "first", value: 7 });

        // Schedule third task.

        scheduler.schedule("third");

        assert.strictEqual(scheduler.events.length, 4);
        assert.deepStrictEqual(scheduler.lastEvent, { type: EventType.StartRunning, id: "third" });
    });

    it("Wait if busy", async () => {
        const scheduler = new TestScheduler(2);
        const [promise_0, resolve_0] = scheduler.schedule("first");

        scheduler.schedule("second");
        scheduler.schedule("third");

        // Since we only allow two running tasks, the third task must wait.

        assert.deepStrictEqual(scheduler.events, [
            { type: EventType.StartRunning, id: "first" },
            { type: EventType.StartRunning, id: "second" },
        ]);

        resolve_0(7);
        assert.strictEqual(await promise_0, 7);

        // Now the third task is free to run.

        assert.deepStrictEqual(scheduler.events, [
            { type: EventType.StartRunning, id: "first" },
            { type: EventType.StartRunning, id: "second" },
            { type: EventType.StartRunning, id: "third" },
            { type: EventType.Resolve, id: "first", value: 7 },
        ]);
    });

    it("Replace waiting task", async () => {
        const scheduler = new TestScheduler(2);
        const [promise_0, resolve_0] = scheduler.schedule("first");

        scheduler.schedule("second");
        scheduler.schedule("third");
        scheduler.schedule("fourth");

        // Since we only allow two running tasks, the third task will be ignored, and the fourth task will needs to
        // wait.

        assert.deepStrictEqual(scheduler.events, [
            { type: EventType.StartRunning, id: "first" },
            { type: EventType.StartRunning, id: "second" },
        ]);

        resolve_0(7);
        assert.strictEqual(await promise_0, 7);

        // Now the fourth task is free to run.

        assert.deepStrictEqual(scheduler.events, [
            { type: EventType.StartRunning, id: "first" },
            { type: EventType.StartRunning, id: "second" },
            { type: EventType.StartRunning, id: "fourth" },
            { type: EventType.Resolve, id: "first", value: 7 },
        ]);
    });

    it("Cancel old tasks", async () => {
        const scheduler = new TestScheduler(2);
        const [promise_0, resolve_0] = scheduler.schedule("first");
        const [promise_1, resolve_1] = scheduler.schedule("second");

        assert.deepStrictEqual(scheduler.events, [
            { type: EventType.StartRunning, id: "first" },
            { type: EventType.StartRunning, id: "second" },
        ]);

        resolve_1(7);
        assert.strictEqual(await promise_1, 7);
        resolve_0(4);
        assert.strictEqual(await promise_0, 4);

        assert.deepStrictEqual(scheduler.events, [
            { type: EventType.StartRunning, id: "first" },
            { type: EventType.StartRunning, id: "second" },
            { type: EventType.Resolve, id: "second", value: 7 },
            { type: EventType.Cancel, id: "first" },
        ]);
    });
});
