import { AppArchive } from "../messages";
import { ensureValid } from "../utilities";
import { Controller, ViewEventListener, ZoomMode } from "./controller";

const theXmlParser = new DOMParser();

function rawParseSvg(image: string): Document {
    return theXmlParser.parseFromString(image, "image/svg+xml");
}

const theDefaultImage = rawParseSvg(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100px" height="100px"></svg>'
).documentElement as Element as SVGSVGElement;

export interface AppEventListener extends ViewEventListener {
    onImageChanged(image: SVGSVGElement): void;
    onStatusChanged(status: string | null): void;
}

function parseSVG(image: string): SVGSVGElement | [SVGSVGElement | null, string] {
    const imageDocument = rawParseSvg(image);
    const rootElement = imageDocument.documentElement;

    if (rootElement instanceof SVGSVGElement) {
        return rootElement;
    } else {
        const partialSvg = imageDocument.querySelector("svg");
        const errorMessage = ensureValid(ensureValid(imageDocument.querySelector("parsererror>div")).textContent);

        return [partialSvg, errorMessage];
    }
}

function measureImageSize(svg: SVGSVGElement): [number, number] {
    return [svg.width.baseVal.value, svg.height.baseVal.value];
}

export class App {
    public static create(width: number, height: number, appEventListener: AppEventListener): App {
        const [imageWidth, imageHeight] = measureImageSize(theDefaultImage);

        return new App(
            theDefaultImage.outerHTML,
            null,
            Controller.create(
                width,
                height,
                imageWidth,
                imageHeight,
                this.contentMargin,
                appEventListener,
                this.zoomStep,
                this.offsetStep,
                this.initialZoomMode
            ),
            appEventListener
        );
    }

    public static fromArchive(archive: AppArchive, appEventListener: AppEventListener): App {
        return new App(
            archive.image,
            archive.status,
            Controller.fromArchive(archive.controller, appEventListener),
            appEventListener
        );
    }

    private static readonly contentMargin = 10;
    private static readonly zoomStep = 1.2;
    private static readonly offsetStep = 10;
    private static readonly initialZoomMode = ZoomMode.AutoFit;

    private constructor(
        private imageValue: string,
        private status: string | null,
        private readonly controller: Controller,
        private appEventListener: AppEventListener
    ) {
    }

    public get image(): string {
        return this.imageValue;
    }

    public beginDrag(x: number, y: number): (x: number, y: number) => void {
        return this.controller.beginDrag(x, y);
    }

    public makeCenter(): void {
        this.controller.makeCenter();
    }

    public makeIdentity(): void {
        this.controller.makeIdentity();
    }

    public moveDown(): void {
        this.controller.moveDown();
    }

    public moveLeft(): void {
        this.controller.moveLeft();
    }

    public moveRight(): void {
        this.controller.moveRight();
    }

    public moveUp(): void {
        this.controller.moveUp();
    }

    public resize(width: number, height: number): void {
        this.controller.resize(width, height);
    }

    public setZoomMode(zoomMode: ZoomMode): void {
        this.controller.setZoomMode(zoomMode);
    }

    public toggleOverview(x: number, y: number): void {
        this.controller.toggleOverview(x, y);
    }

    public toggleOverviewCenter(): void {
        this.controller.toggleOverviewCenter();
    }

    public zoomIn(x: number, y: number): void {
        this.controller.zoomIn(x, y);
    }

    public zoomOut(x: number, y: number): void {
        this.controller.zoomOut(x, y);
    }

    public zoomInCenter(): void {
        this.controller.zoomInCenter();
    }

    public zoomOutCenter(): void {
        this.controller.zoomOutCenter();
    }

    public setImage(image: string): void {
        const result = parseSVG(image);
        let svg: SVGSVGElement;

        if (result instanceof SVGSVGElement) {
            svg = result;

            this.imageValue = image;
            this.status = null;
        } else {
            const [maybeSvg, errorMessage] = result;

            svg = maybeSvg === null ? theDefaultImage : maybeSvg;

            this.imageValue = svg.outerHTML;
            this.status = `Invalid SVG: ${errorMessage}`;
        }

        const [imageWidth, imageHeight] = measureImageSize(svg);

        this.controller.resizeContent(imageWidth, imageHeight);

        // A hack to remove extra space of the graph within the img element.
        svg.setAttribute("preserveAspectRatio", "none");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");

        this.appEventListener.onImageChanged(svg);
        this.appEventListener.onStatusChanged(this.status);
    }

    public setStatus(status: string | null): void {
        this.status = status;

        this.appEventListener.onStatusChanged(status);
    }

    public serialize(): AppArchive {
        return {
            controller: this.controller.serialize(),
            image: this.image,
            status: this.status
        };
    }
}
