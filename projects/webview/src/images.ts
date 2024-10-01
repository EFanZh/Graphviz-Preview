import { type Image, ImageType } from "../../shared/src/images";

const domParser = new DOMParser();

export interface ParsedImage {
    styleSheetElements: readonly HTMLLinkElement[];
    width: number;
    height: number;
    asNode(): Node;
}

export class ParsedSvgImage implements ParsedImage {
    public constructor(
        public readonly styleSheetElements: readonly HTMLLinkElement[],
        private readonly element: SVGSVGElement,
    ) {}

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
        const svgDocument = domParser.parseFromString(data, "image/svg+xml");
        const documentElement = svgDocument.documentElement;

        if (!(documentElement instanceof SVGSVGElement)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            throw new Error(documentElement.querySelector("parsererror")!.textContent!);
        }

        // Parse style sheets.

        const styleSheetsData: string[] = [];

        svgDocument.childNodes.forEach((node) => {
            if (node instanceof ProcessingInstruction && node.nodeName === "xml-stylesheet") {
                styleSheetsData.push(`<link rel="stylesheet" ${node.data} />`);
            }
        });

        const styleSheetContainer = document.createElement("div");

        styleSheetContainer.innerHTML = styleSheetsData.join();

        const styleSheetElements: HTMLLinkElement[] = [];

        styleSheetContainer.childNodes.forEach((element) => {
            if (element instanceof HTMLLinkElement) {
                styleSheetElements.push(element);
            }
        });

        styleSheetContainer.replaceChildren();

        return new ParsedSvgImage(styleSheetElements, documentElement);
    }
}

export function parseImage(image: Image): ParsedImage {
    switch (image.type) {
        case ImageType.Svg:
            return ParsedSvgImage.parse(image.data);
    }
}
