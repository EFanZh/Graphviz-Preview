import { type Configuration } from "../configurations";
import { type Image } from "../../../shared/src/images";

export interface Engine {
    render(
        configuration: Configuration,
        cwd: string,
        source: string,
        onCancel: (cancelFn: () => void) => void,
    ): Promise<Image[]>;
    save(configuration: Configuration, cwd: string, source: string): Promise<void>;
}
