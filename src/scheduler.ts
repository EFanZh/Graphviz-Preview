const idle = Symbol("Idle");
const working = Symbol("Working");

export function createScheduler<TArg, TResult, TError>(
    executer: (arg: TArg) => Promise<TResult>,
    resolve: (result: TResult) => void,
    reject: (error: TError) => void
): (arg: TArg) => void {
    let state: typeof idle | typeof working | TArg = idle;

    async function execute(arg: TArg): Promise<void> {
        while (true) {
            let resolveAction: () => void;

            try {
                const result = await executer(arg);

                resolveAction = () => resolve(result);
            } catch (error) {
                resolveAction = () => reject(error);
            }

            switch (state) {
                case idle:
                    throw new Error("This should never happen.");
                case working:
                    state = idle;
                    resolveAction();

                    // No more work todo.
                    return;
                default:
                    arg = state;
                    state = working;
                    resolveAction();

                    // Run next task.
                    break;
            }
        }
    }

    return (arg) => {
        if (state === idle) {
            state = working;

            execute(arg);
        } else {
            state = arg;
        }
    };
}
