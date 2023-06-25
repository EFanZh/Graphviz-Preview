export class IdGenerator {
    private nextId = 0;

    public next(): number {
        const result = this.nextId;

        if (result < Number.MAX_SAFE_INTEGER) {
            ++this.nextId;
        } else {
            this.nextId = 0;
        }

        return result;
    }
}
