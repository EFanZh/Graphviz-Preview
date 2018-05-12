function createCancellationToken(): [Promise<void>, () => void] {
    let resolver: () => void;

    const result = new Promise<void>((resolve) => resolver = resolve);

    return [result, resolver!];
}

export function createScheduler<TArg, TResult, TError>(
    executer: (arg: TArg, cancel: Promise<void>) => Promise<TResult>,
    resolve: (result: TResult) => void,
    reject: (error: TError) => void
): (arg: TArg) => void {
    const maxConcurrentTasks = 4;

    // The running task queue.
    const q = [] as Array<() => void>;

    return async (arg: TArg) => {
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
            const result = await executer(arg, cancelPromise);

            resolveAction = () => resolve(result);
        } catch (error) {
            resolveAction = () => reject(error);
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
