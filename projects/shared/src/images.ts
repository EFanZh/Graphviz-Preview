export const enum ImageType {
    Svg,
}

export interface SvgImage {
    type: ImageType.Svg;
    data: string;
}

export type Image = SvgImage;
