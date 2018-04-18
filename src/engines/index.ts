import * as dot from "./dot";

export function getEngine(): (source: string) => Promise<string> {
    return dot.compile;
}
