function fit(
    width: number,
    height: number,
    contentWidth: number,
    contentHeight: number,
    contentMargin: number
): [number, number, number] {
    const contentMargin2 = contentMargin * 2;
    const zoomX = (width - contentMargin2) / contentWidth;
    const zoomY = (height - contentMargin2) / contentHeight;

    if (zoomX < zoomY) {
        return [contentMargin, (height - contentHeight * zoomX) / 2, zoomX];
    } else {
        return [(width - contentWidth * zoomY) / 2, contentMargin, zoomY];
    }
}

export interface IView {
    readonly width: number;
    readonly height: number;
    readonly contentWidth: number;
    readonly contentHeight: number;
    readonly contentMargin: number;
    readonly contentX: number;
    readonly contentY: number;
    readonly zoom: number;
    readonly isIdentity: boolean;
    readonly isCenter: boolean;
}

export abstract class FixedView implements IView {
    public abstract readonly zoom: number;

    protected constructor(
        public width: number,
        public height: number,
        public contentWidth: number,
        public contentHeight: number,
        public contentMargin: number,
        public contentX: number,
        public contentY: number,
        public isCenter: boolean,
        public isIdentity: boolean
    ) {
    }

    public resize(width: number, height: number): void {
        this.contentX += (width - this.width) / 2;
        this.contentY += (height - this.height) / 2;
        this.width = width;
        this.height = height;
    }

    public resizeContent(width: number, height: number): void {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;

        this.contentX = halfWidth + (this.contentX - halfWidth) * width / this.contentWidth;
        this.contentY = halfHeight + (this.contentY - halfHeight) * height / this.contentHeight;
        this.contentWidth = width;
        this.contentHeight = height;
    }

    public resizeAll(width: number, height: number, contentWidth: number, contentHeight: number): void {
        this.contentX = (this.contentX - this.width / 2) * contentWidth / this.contentWidth + width / 2;
        this.contentY = (this.contentY - this.height / 2) * contentHeight / this.contentHeight + height / 2;
        this.width = width;
        this.height = height;
        this.contentWidth = contentWidth;
        this.contentHeight = contentHeight;
    }

    public toFit(): FitView {
        return new FitView(this.width, this.height, this.contentWidth, this.contentHeight, this.contentMargin);
    }

    public toIdentityCenter(): IdentityCenterView {
        return new IdentityCenterView(
            this.width,
            this.height,
            this.contentWidth,
            this.contentHeight,
            this.contentMargin
        );
    }
}

export class View extends FixedView {
    public static createFit(
        width: number,
        height: number,
        contentWidth: number,
        contentHeight: number,
        contentMargin: number
    ): View {
        const [x, y, zoom] = fit(width, height, contentWidth, contentHeight, contentMargin);

        return new View(width, height, contentWidth, contentHeight, contentMargin, x, y, zoom);
    }

    constructor(
        width: number,
        height: number,
        contentWidth: number,
        contentHeight: number,
        contentMargin: number,
        contentX: number,
        contentY: number,
        public zoom: number
    ) {
        super(width, height, contentWidth, contentHeight, contentMargin, contentX, contentY, false, false);
    }

    public toIdentity(x: number, y: number): IdentityView {
        return new IdentityView(
            this.width,
            this.height,
            this.contentWidth,
            this.contentHeight,
            this.contentMargin,
            x + (this.contentX - x) / this.zoom,
            y + (this.contentY - y) / this.zoom
        );
    }

    public zoomTo(x: number, y: number, zoom: number): void {
        this.contentX = x + (this.contentX - x) * zoom / this.zoom;
        this.contentY = y + (this.contentY - y) * zoom / this.zoom;
        this.zoom = zoom;
    }
}

export class IdentityView extends FixedView {
    public static createCenter(
        width: number,
        height: number,
        contentWidth: number,
        contentHeight: number,
        contentMargin: number
    ): IdentityView {
        return new IdentityView(
            width,
            height,
            contentWidth,
            contentHeight,
            contentMargin,
            (width - contentWidth) / 2,
            (height - contentHeight) / 2
        );
    }

    public readonly zoom: number = 1;

    public constructor(
        width: number,
        height: number,
        contentWidth: number,
        contentHeight: number,
        contentMargin: number,
        contentX: number,
        contentY: number
    ) {
        super(width, height, contentWidth, contentHeight, contentMargin, contentX, contentY, false, true);
    }

    public zoomTo(x: number, y: number, zoom: number): View {
        return new View(
            this.width,
            this.height,
            this.contentWidth,
            this.contentHeight,
            this.contentMargin,
            x + (this.contentX - x) * zoom,
            y + (this.contentY - y) * zoom,
            zoom
        );
    }
}

export class FitView implements IView {
    public readonly isIdentity = false;
    public readonly isCenter = true;
    private widthValue: number;
    private heightValue: number;
    private contentWidthValue: number;
    private contentHeightValue: number;
    private contentMarginValue: number;
    private contentXValue: number;
    private contentYValue: number;
    private zoomValue: number;

    public constructor(
        width: number,
        height: number,
        contentWidth: number,
        contentHeight: number,
        contentMargin: number
    ) {
        this.widthValue = width;
        this.heightValue = height;
        this.contentWidthValue = contentWidth;
        this.contentHeightValue = contentHeight;
        this.contentMarginValue = contentMargin;

        [this.contentXValue, this.contentYValue, this.zoomValue] = fit(
            width,
            height,
            contentWidth,
            contentHeight,
            contentMargin
        );
    }

    public get width(): number {
        return this.widthValue;
    }

    public get height(): number {
        return this.heightValue;
    }

    public get contentWidth(): number {
        return this.contentWidthValue;
    }

    public get contentHeight(): number {
        return this.contentHeightValue;
    }

    public get contentMargin(): number {
        return this.contentMarginValue;
    }

    public get contentX(): number {
        return this.contentXValue;
    }

    public get contentY(): number {
        return this.contentYValue;
    }

    public get zoom(): number {
        return this.zoomValue;
    }

    public resize(width: number, height: number): void {
        this.widthValue = width;
        this.heightValue = height;
        this.fit();
    }

    public resizeContent(width: number, height: number): void {
        this.contentWidthValue = width;
        this.contentHeightValue = height;
        this.fit();
    }

    public zoomTo(x: number, y: number, zoom: number): View {
        return new View(
            this.width,
            this.height,
            this.contentWidth,
            this.contentHeight,
            this.contentMargin,
            x + (this.contentX - x) * zoom / this.zoom,
            y + (this.contentY - y) * zoom / this.zoom,
            zoom
        );
    }

    public moveTo(x: number, y: number): View {
        return new View(
            this.width,
            this.height,
            this.contentWidth,
            this.contentHeight,
            this.contentMargin,
            x,
            y,
            this.zoom
        );
    }

    public toIdentity(x: number, y: number): IdentityView {
        return new IdentityView(
            this.width,
            this.height,
            this.contentWidth,
            this.contentHeight,
            this.contentMargin,
            x + (this.contentX - x) / this.zoom,
            y + (this.contentY - y) / this.zoom
        );
    }

    public toIdentityCenter(): IdentityCenterView {
        return new IdentityCenterView(
            this.width,
            this.height,
            this.contentWidth,
            this.contentHeight,
            this.contentMargin
        );
    }

    public toIdentityCenterWithSize(width: number, height: number): IdentityCenterView {
        return new IdentityCenterView(
            width,
            height,
            this.contentWidth,
            this.contentHeight,
            this.contentMargin
        );
    }

    public toIdentityCenterWithContentSize(width: number, height: number): IdentityCenterView {
        return new IdentityCenterView(
            this.width,
            this.height,
            width,
            height,
            this.contentMargin
        );
    }

    private fit(): void {
        [this.contentXValue, this.contentYValue, this.zoomValue] = fit(
            this.width,
            this.height,
            this.contentWidth,
            this.contentHeight,
            this.contentMargin
        );
    }
}

export class IdentityCenterView implements IView {
    public readonly isIdentity = true;
    public readonly isCenter = true;
    public readonly zoom: number = 1;
    private widthValue: number;
    private heightValue: number;
    private contentWidthValue: number;
    private contentHeightValue: number;
    private contentXValue: number;
    private contentYValue: number;

    public constructor(
        width: number,
        height: number,
        contentWidth: number,
        contentHeight: number,
        public contentMargin: number
    ) {
        this.widthValue = width;
        this.heightValue = height;
        this.contentWidthValue = contentWidth;
        this.contentHeightValue = contentHeight;
        this.contentXValue = (width - contentWidth) / 2;
        this.contentYValue = (height - contentHeight) / 2;
    }

    public get width(): number {
        return this.widthValue;
    }

    public get height(): number {
        return this.heightValue;
    }

    public get contentWidth(): number {
        return this.contentWidthValue;
    }

    public get contentHeight(): number {
        return this.contentHeightValue;
    }

    public get contentX(): number {
        return this.contentXValue;
    }

    public get contentY(): number {
        return this.contentYValue;
    }

    public resize(width: number, height: number): void {
        this.widthValue = width;
        this.heightValue = height;

        this.center();
    }

    public resizeContent(width: number, height: number): void {
        this.contentWidthValue = width;
        this.contentHeightValue = height;

        this.center();
    }

    public moveTo(x: number, y: number): IdentityView {
        return new IdentityView(
            this.width,
            this.height,
            this.contentWidth,
            this.contentHeight,
            this.contentMargin,
            x,
            y
        );
    }

    public zoomTo(x: number, y: number, zoom: number): View {
        return new View(
            this.width,
            this.height,
            this.contentWidth,
            this.contentHeight,
            this.contentMargin,
            x + (this.contentX - x) * zoom,
            y + (this.contentY - y) * zoom,
            zoom
        );
    }

    public toFit(): FitView {
        return new FitView(this.width, this.height, this.contentWidth, this.contentHeight, this.contentMargin);
    }

    public toFitWithSize(width: number, height: number): FitView {
        return new FitView(width, height, this.contentWidth, this.contentHeight, this.contentMargin);
    }

    public toFitWithContentSize(width: number, height: number): FitView {
        return new FitView(this.width, this.height, width, height, this.contentMargin);
    }

    private center(): void {
        this.contentXValue = (this.width - this.contentWidth) / 2;
        this.contentYValue = (this.height - this.contentHeight) / 2;
    }
}
