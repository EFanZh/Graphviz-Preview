import { Image, ImageType } from "../../shared/src/images";

const domParser = new DOMParser();

export interface ParsedImage {
    width: number;
    height: number;
    asNode(): Node;
}

export class ParsedSvgImage implements ParsedImage {
    public constructor(private readonly element: SVGSVGElement) {}

    public get width(): number {
        return this.element.width.baseVal.value;
    }

    public get height(): number {
        return this.element.height.baseVal.value;
    }

    public asNode(): Node {
        return this.element;
    }

    public static parse(data: string): ParsedSvgImage {
        const documentElement = domParser.parseFromString(data, "image/svg+xml").documentElement;

        if (documentElement instanceof SVGSVGElement) {
            return new ParsedSvgImage(documentElement);
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        throw new Error(documentElement.querySelector("parsererror")!.textContent!);
    }
}

export function parseImage(image: Image): ParsedImage {
    switch (image.type) {
        case ImageType.Svg:
            return ParsedSvgImage.parse(image.data);
    }
}
