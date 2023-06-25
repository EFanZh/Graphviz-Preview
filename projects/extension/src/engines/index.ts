import { Image } from "../../../shared/src/images";
import { Configuration } from "../configurations";

export interface Engine {
    render(
        configuration: Configuration,
        cwd: string,
        source: string,
        onCancel: (cancelFn: () => void) => void,
    ): Promise<Image[]>;
    save(configuration: Configuration, cwd: string, source: string): Promise<void>;
}
