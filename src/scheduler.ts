import { ensureValid } from "./utilities";

function createCancellationToken(): [Promise<void>, () => void] {
    let resolver: (() => void) | undefined = undefined;

    const result = new Promise<void>((resolve) => resolver = resolve);

    return [result, ensureValid<() => void>(resolver)]; // How to remove the type annotation?
}

export function createScheduler<TArgs extends any[], TResult, TError>(
    executer: (cancel: Promise<void>, ...args: TArgs) => Promise<TResult>,
    resolve: (result: TResult) => void,
    reject: (error: TError) => void
): (...args: TArgs) => void {
    const maxConcurrentTasks = 4;

    // The running task queue.
    const q = [] as Array<() => void>;

    return async (...args: TArgs): Promise<void> => {
        const [cancelPromise, cancel] = createCancellationToken();

        if (q.length < maxConcurrentTasks) {
            // We can schedule the execution immediately.
            q.push(cancel);
        } else {
            // Cancel the oldest task.
            q[0]();
            q.shift();

            q.push(cancel);
        }

        let resolveAction: () => void;

        try {
            const result = await executer(cancelPromise, ...args);

            resolveAction = (): void => resolve(result);
        } catch (error) {
            resolveAction = (): void => reject(error);
        }

        // Get the index of the current task in the task queue.
        const index = q.indexOf(cancel);

        if (index < 0) {
            // This task is obsolete, ignore the result.
        } else {
            // Cancel obselete tasks.
            for (let i = 0; i < index; i++) {
                q[i]();
            }

            // Remove obselete and current task.
            q.splice(0, index + 1);

            resolveAction();
        }
    };
}
