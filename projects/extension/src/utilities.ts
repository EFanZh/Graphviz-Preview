const resolverRegexReplacer = RegExp.prototype[Symbol.replace].bind(/\$\{([^{}]+)\}/g);

// TODO: Use `Promise.withResolvers` when possible:
// <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers>.
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
    return resolverRegexReplacer(s, (fallback, key: string) => {
        const candidate = resolve(key);

        return candidate ?? fallback;
    });
}
