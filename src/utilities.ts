export function ensureValid<T>(value: T | null | undefined): T {
    if (value === null || value === undefined) {
        throw new Error();
    } else {
        return value;
    }
}
