const placeholderRegex = /\$\{([^{}]+)\}/g;

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

export function resolveVariables(s: string, resolve: (key: string) => string | undefined): string {
    return s.replace(placeholderRegex, (fallback, key) => {
        const candidate = resolve(key);

        return candidate === undefined ? fallback : candidate;
    });
}
