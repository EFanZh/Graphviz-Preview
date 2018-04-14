import { Controller, IControllerArchive, IViewEventListener, ZoomMode } from "./controller";

const theXmlParser = new DOMParser();

export interface IAppEventListener extends IViewEventListener {
    onImageChanged(image: string): void;
    onStatusChanged(status: string | null): void;
}

function measureImageSize(image: string): [number, number] {
    const imageDocument = theXmlParser.parseFromString(image, "image/svg+xml");
    const rootElement = imageDocument.rootElement;

    return [rootElement.width.baseVal.value, rootElement.height.baseVal.value];
}

interface IAppArchive {
    image: string;
    status: string | null;
    controller: IControllerArchive;
}

export class App {
    public static create(width: number, height: number, appEventListener: IAppEventListener): App {
        const initialImage = '<svg xmlns="http://www.w3.org/2000/svg" width="100px" height="100px"></svg>';
        const [imageWidth, imageHeight] = measureImageSize(initialImage);

        return new App(
            initialImage,
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
        this.imageValue = image;
        const [imageWidth, imageHeight] = measureImageSize(image);

        this.controller.resizeContent(imageWidth, imageHeight);
        this.setStatus(null);

        this.appEventListener.onImageChanged(image);
        this.appEventListener.onStatusChanged(null);
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
