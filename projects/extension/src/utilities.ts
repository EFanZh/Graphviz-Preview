export function createPromise<T>(): [Promise<T>, (value: T) => void, (reason: unknown) => void] {
    let resolve: (value: T) => void;
    let reject: (reason: unknown) => void;

    const promise = new Promise<T>((resolveFn, rejectFn) => {
        resolve = resolveFn;
        reject = rejectFn;
    });

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return [promise, resolve!, reject!];
}
