export const enum ScaleMode {
    Fixed,
    Fit,
    AutoFit,
}

export interface LayoutView {
    setIsCenter(value: boolean): void;
    setIsIdentity(value: boolean): void;
    setScaleMode(value: ScaleMode): void;
    setImagePosition(x: number, y: number): void;
    setImageDisplaySize(width: number, height: number): void;
    setImageScale(scale: number): void;
}
