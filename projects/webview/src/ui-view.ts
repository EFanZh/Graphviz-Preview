import { type LayoutView } from "./layout-view";
import { type ParsedImage } from "./images";
import { type Size } from "./layout";

export interface UiView extends LayoutView {
    getViewSize(): Size;
    setImage(currentPage: number, totalPages: number, image: ParsedImage): void;
    setPreviewStatus(status: string): void;
}
