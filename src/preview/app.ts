import { Controller, IControllerArchive, IViewEventListener, ZoomMode } from "./controller";

const theXmlParser = new DOMParser();

const theDefaultImage = theXmlParser.parseFromString(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100px" height="100px"></svg>',
    "image/svg+xml"
).rootElement;

export interface IAppEventListener extends IViewEventListener {
    onImageChanged(image: string): void;
    onStatusChanged(status: string | null): void;
}

function parseSVG(image: string): SVGSVGElement | [SVGSVGElement | null, string] {
    const imageDocument = theXmlParser.parseFromString(image, "image/svg+xml");
    const rootElement = imageDocument.rootElement;

    if (rootElement) {
        return rootElement;
    } else {
        const partialSvg = imageDocument.querySelector("svg");
        const errorMessage = imageDocument.querySelector("parsererror>div")!.textContent!;

        return [partialSvg, errorMessage];
    }
}

function measureImageSize(svg: SVGSVGElement): [number, number] {
    return [svg.width.baseVal.value, svg.height.baseVal.value];
}

interface IAppArchive {
    image: string;
    status: string | null;
    controller: IControllerArchive;
}

export class App {
    public static create(width: number, height: number, appEventListener: IAppEventListener): App {
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
                this.initialZoomMode
            ),
            appEventListener
        );
    }

    public static fromArchive(archive: IAppArchive, appEventListener: IAppEventListener): App {
        return new App(
            archive.image,
            archive.status,
            Controller.fromArchive(archive.controller, appEventListener),
            appEventListener
        );
    }

    private static readonly contentMargin = 10;
    private static readonly zoomStep = 1.2;
    private static readonly initialZoomMode = ZoomMode.AutoFit;

    private constructor(
        private imageValue: string,
        private status: string | null,
        private readonly controller: Controller,
        private appEventListener: IAppEventListener
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

    public resize(width: number, height: number): void {
        this.controller.resize(width, height);
    }

    public setZoomMode(zoomMode: ZoomMode): void {
        this.controller.setZoomMode(zoomMode);
    }

    public toggleOverview(x: number, y: number): void {
        this.controller.toggleOverview(x, y);
    }

    public zoomIn(x: number, y: number): void {
        this.controller.zoomIn(x, y);
    }

    public zoomOut(x: number, y: number): void {
        this.controller.zoomOut(x, y);
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

        this.appEventListener.onImageChanged(this.imageValue);
        this.appEventListener.onStatusChanged(this.status);
    }

    public setStatus(status: string | null): void {
        this.status = status;

        this.appEventListener.onStatusChanged(status);
    }

    public serialize(): IAppArchive {
        return {
            controller: this.controller.serialize(),
            image: this.image,
            status: this.status
        };
    }
}
