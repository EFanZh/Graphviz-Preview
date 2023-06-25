import * as utilities from "./utilities";

// Function for triggering cancellation.
type CancelFn = () => void;

// Function for registering cancellation actions.
type OnCancelFn = (cancelFn: () => void) => void;

// Conditionally calling a function.
type OnCompleteFn = (thenFn: () => void) => void;

// Function for starting a task.
type StartTaskFn = (cancelFn: CancelFn, onCompleteFn: OnCompleteFn) => void;

export class Scheduler {
    private queue: CancelFn[] = [];
    private waitingTaskFn: StartTaskFn | undefined = undefined;

    public constructor(private maxRunningTasks: number) {}

    private startTask(startTaskFn: StartTaskFn) {
        const [cancelPromise, cancelFn] = utilities.createPromise<void>();
        const onCancel = cancelPromise.then.bind(cancelPromise);

        this.queue.push(cancelFn);
        startTaskFn(onCancel, this.onTaskComplete.bind(this, cancelFn));
    }

    private onTaskComplete(cancelFn: CancelFn, thenFn: () => void) {
        const queue = this.queue;
        const index = queue.indexOf(cancelFn);

        if (index !== -1) {
            let i = 0;

            for (const cancelFn of queue) {
                if (i === index) {
                    break;
                }

                i += 1;

                cancelFn();
            }

            queue.splice(0, index + 1);

            if (this.waitingTaskFn !== undefined) {
                const taskFn = this.waitingTaskFn;

                this.waitingTaskFn = undefined;
                this.startTask(taskFn);
            }

            thenFn();
        }
    }

    public schedule<T>(
        taskFn: (onCancel: OnCancelFn) => Promise<T>,
        resolve: (value: T) => void,
        reject: (reason: unknown) => void,
    ) {
        const startTaskFn: StartTaskFn = (onCancel, onComplete) =>
            taskFn(onCancel).then(
                (value) => onComplete(() => resolve(value)),
                (reason) => onComplete(() => reject(reason)),
            );

        if (this.queue.length < this.maxRunningTasks) {
            this.startTask(startTaskFn);
        } else {
            this.waitingTaskFn = startTaskFn;
        }
    }
}
