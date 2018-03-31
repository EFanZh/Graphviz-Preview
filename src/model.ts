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

interface IView {
    readonly width: number;
    readonly height: number;
    readonly contentWidth: number;
    readonly contentHeight: number;
    readonly contentMargin: number;
    readonly contentX: number;
    readonly contentY: number;
    readonly zoom: number;
}

abstract class FixedView implements IView {
    public abstract readonly zoom: number;

    constructor(
        public width: number,
        public height: number,
        public contentWidth: number,
        public contentHeight: number,
        public contentMargin: number,
        public contentX: number,
        public contentY: number
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

class View extends FixedView {
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
        super(width, height, contentWidth, contentHeight, contentMargin, contentX, contentY);
    }

    public zoomTo(x: number, y: number, zoom: number): void {
        this.contentX = x + (this.contentX - x) * zoom / this.zoom;
        this.contentY = y + (this.contentY - y) * zoom / this.zoom;
        this.zoom = zoom;
    }
}

class IdentityView extends FixedView {
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
        super(width, height, contentWidth, contentHeight, contentMargin, contentX, contentY);
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

class FitView implements IView {
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

class IdentityCenterView implements IView {
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

function hasEnoughSpace(
    contentWidth: number,
    contentHeight: number,
    availableWidth: number,
    availableHeight: number
): boolean {
    return contentWidth < availableWidth && contentHeight < availableHeight;
}

function viewHasEnoughSpace(view: IView): boolean {
    const contentMargin = view.contentMargin * 2;

    return hasEnoughSpace(
        view.contentWidth,
        view.contentHeight,
        view.width - contentMargin,
        view.height - contentMargin
    );
}

function viewHasEnoughSpaceWithContentSize(view: IView, contentWidth: number, contentHeight: number): boolean {
    const contentMargin = view.contentMargin * 2;

    return hasEnoughSpace(contentWidth, contentHeight, view.width - contentMargin, view.height - contentMargin);
}

function viewHasEnoughSpaceWithSize(view: IView, width: number, height: number): boolean {
    const contentMargin = view.contentMargin * 2;

    return hasEnoughSpace(view.contentWidth, view.contentHeight, width - contentMargin, height - contentMargin);
}

export const enum ZoomMode {
    Fixed,
    Fit,
    AutoFit
}

interface IViewState {
    readonly view: IView;
    readonly zoomMode: ZoomMode;

    moveTo(x: number, y: number): FixedState;
    resize(width: number, height: number): IViewState;
    resizeContent(width: number, height: number): IViewState;
    setZoomMode(zoomMode: ZoomMode): IViewState;
    toggleOverview(x: number, y: number): IViewState;
    zoomTo(x: number, y: number, zoom: number): FixedNormalState;
}

abstract class FixedState implements IViewState {
    public static create(
        width: number,
        height: number,
        contentWidth: number,
        contentHeight: number,
        contentMargin: number
    ): FixedState {
        const contentMargin2 = contentMargin * 2;

        if (hasEnoughSpace(contentWidth, contentHeight, width - contentMargin2, height - contentMargin2)) {
            return new Fixed100PercentState(
                IdentityView.createCenter(width, height, contentWidth, contentHeight, contentMargin)
            );
        } else {
            return new FixedNormalState(View.createFit(width, height, contentWidth, contentHeight, contentMargin));
        }
    }

    public abstract readonly view: FixedView;
    public readonly zoomMode = ZoomMode.Fixed;

    public moveTo(x: number, y: number): FixedState {
        this.view.contentX = x;
        this.view.contentY = y;

        return this;
    }

    public resize(width: number, height: number): FixedState {
        this.view.resize(width, height);

        return this;
    }

    public resizeContent(width: number, height: number): FixedState {
        this.view.resizeContent(width, height);

        return this;
    }

    public resizeAll(
        width: number,
        height: number,
        contentWidth: number,
        contentHeight: number,
        contentMargin: number
    ): void {
        this.view.resizeAll(width, height, contentWidth, contentHeight);
        this.view.contentMargin = contentMargin;
    }

    public abstract setZoomMode(zoomMode: ZoomMode): IViewState;
    public abstract toggleOverview(x: number, y: number): IViewState;
    public abstract zoomTo(x: number, y: number, zoom: number): FixedNormalState;

}

class FixedNormalState extends FixedState {
    public constructor(public readonly view: View) {
        super();
    }

    public setZoomMode(zoomMode: ZoomMode): IViewState {
        switch (zoomMode) {
            case ZoomMode.Fixed:
                return this;
            case ZoomMode.Fit:
                return new FitState(this.view.toFit(), this, this.view.zoom);
            case ZoomMode.AutoFit:
                return AutoFitState.fromFixedView(this.view, this, this.view.zoom);
        }
    }

    public toggleOverview(): FitState {
        return new FitState(this.view.toFit(), this, this.view.zoom);
    }

    public zoomTo(x: number, y: number, zoom: number): FixedNormalState {
        this.view.zoomTo(x, y, zoom);

        return this;
    }
}

class Fixed100PercentState extends FixedState {
    public constructor(public readonly view: IdentityView, private readonly savedZoom?: number) {
        super();
    }

    public setZoomMode(zoomMode: ZoomMode): IViewState {
        switch (zoomMode) {
            case ZoomMode.Fixed:
                return this;
            case ZoomMode.Fit:
                return new FitState(this.view.toFit(), this, this.savedZoom);
            case ZoomMode.AutoFit:
                return AutoFitState.fromFixedView(this.view, this, this.savedZoom);
        }
    }

    public toggleOverview(x: number, y: number): FixedNormalState | FitState {
        if (this.savedZoom === undefined) {
            return new FitState(this.view.toFit(), this, this.savedZoom);
        } else {
            return new FixedNormalState(this.view.zoomTo(x, y, this.savedZoom));
        }
    }

    public zoomTo(x: number, y: number, zoom: number): FixedNormalState {
        return new FixedNormalState(this.view.zoomTo(x, y, zoom));
    }
}

class FitState implements IViewState {
    public readonly zoomMode = ZoomMode.Fit;

    public constructor(
        public readonly view: FitView,
        private readonly savedState?: FixedState,
        private readonly savedZoom?: number
    ) {
    }

    public moveTo(x: number, y: number): FixedNormalState {
        return new FixedNormalState(this.view.moveTo(x, y));
    }

    public resize(width: number, height: number): FitState {
        this.view.resize(width, height);

        return this;
    }

    public resizeContent(width: number, height: number): FitState {
        this.view.resizeContent(width, height);

        return this;
    }

    public setZoomMode(zoomMode: ZoomMode): IViewState {
        switch (zoomMode) {
            case ZoomMode.Fixed:
                if (this.savedState === undefined) {
                    return FixedState.create(
                        this.view.width,
                        this.view.height,
                        this.view.contentWidth,
                        this.view.contentHeight,
                        this.view.contentMargin
                    );
                } else {
                    this.savedState.resizeAll(
                        this.view.width,
                        this.view.height,
                        this.view.contentWidth,
                        this.view.contentHeight,
                        this.view.contentMargin
                    );

                    return this.savedState;
                }
            case ZoomMode.Fit:
                return this;
            case ZoomMode.AutoFit:
                return AutoFitState.fromFitView(this.view, this.savedState, this.savedZoom);
        }
    }

    public toggleOverview(x: number, y: number): Fixed100PercentState {
        return new Fixed100PercentState(this.view.toIdentity(x, y), this.savedZoom);
    }

    public zoomTo(x: number, y: number, zoom: number): FixedNormalState {
        return new FixedNormalState(this.view.zoomTo(x, y, zoom));
    }
}

abstract class AutoFitState implements IViewState {
    public static create(
        width: number,
        height: number,
        contentWidth: number,
        contentHeight: number,
        contentMargin: number
    ): AutoFitState {
        const contentMargin2 = contentMargin * 2;

        if (hasEnoughSpace(contentWidth, contentHeight, width - contentMargin2, height - contentMargin2)) {
            return new AutoFit100PercentState(
                new IdentityCenterView(width, height, contentWidth, contentHeight, contentMargin)
            );
        } else {
            return new AutoFitFitState(new FitView(width, height, contentWidth, contentHeight, contentMargin));
        }
    }

    public static fromFixedView(view: FixedView, savedState?: FixedState, savedZoom?: number): AutoFitState {
        if (viewHasEnoughSpace(view)) {
            return new AutoFit100PercentState(view.toIdentityCenter(), savedState, savedZoom);
        } else {
            return new AutoFitFitState(view.toFit(), savedState, savedZoom);
        }
    }

    public static fromFitView(view: FitView, savedState?: FixedState, savedZoom?: number): AutoFitState {
        if (viewHasEnoughSpace(view)) {
            return new AutoFit100PercentState(view.toIdentityCenter(), savedState, savedZoom);
        } else {
            return new AutoFitFitState(view, savedState, savedZoom);
        }
    }

    public readonly zoomMode = ZoomMode.AutoFit;
    public abstract view: IdentityCenterView | FitView;
    public abstract moveTo(x: number, y: number): FixedState;
    public abstract resize(width: number, height: number): AutoFitState;
    public abstract resizeContent(width: number, height: number): AutoFitState;
    public abstract setZoomMode(zoomMode: ZoomMode): IViewState;
    public abstract toggleOverview(x: number, y: number): IViewState;

    public zoomTo(x: number, y: number, zoom: number): FixedNormalState {
        return new FixedNormalState(this.view.zoomTo(x, y, zoom));
    }
}

class AutoFit100PercentState extends AutoFitState {
    constructor(
        public readonly view: IdentityCenterView,
        private readonly savedState?: FixedState,
        private readonly savedZoom?: number
    ) {
        super();
    }

    public moveTo(x: number, y: number): Fixed100PercentState {
        return new Fixed100PercentState(this.view.moveTo(x, y), this.savedZoom);
    }

    public resize(width: number, height: number): AutoFitState {
        if (viewHasEnoughSpaceWithSize(this.view, width, height)) {
            this.view.resize(width, height);

            return this;
        } else {
            return new AutoFitFitState(this.view.toFitWithSize(width, height), this.savedState, this.savedZoom);
        }
    }

    public resizeContent(width: number, height: number): AutoFitState {
        if (viewHasEnoughSpaceWithContentSize(this.view, width, height)) {
            this.view.resizeContent(width, height);

            return this;
        } else {
            return new AutoFitFitState(this.view.toFitWithContentSize(width, height), this.savedState, this.savedZoom);
        }
    }

    public setZoomMode(zoomMode: ZoomMode): IViewState {
        switch (zoomMode) {
            case ZoomMode.Fixed:
                if (this.savedState === undefined) {
                    return FixedState.create(
                        this.view.width,
                        this.view.height,
                        this.view.contentWidth,
                        this.view.contentHeight,
                        this.view.contentMargin
                    );
                } else {
                    this.savedState.resizeAll(
                        this.view.width,
                        this.view.height,
                        this.view.contentWidth,
                        this.view.contentHeight,
                        this.view.contentMargin
                    );

                    return this.savedState;
                }
            case ZoomMode.Fit:
                return new FitState(this.view.toFit(), this.savedState, this.savedZoom);
            case ZoomMode.AutoFit:
                return this;
        }
    }

    public toggleOverview(x: number, y: number): FixedNormalState | FitState {
        if (this.savedZoom === undefined) {
            return new FitState(this.view.toFit(), this.savedState, this.savedZoom);
        } else {
            return new FixedNormalState(this.view.zoomTo(x, y, this.savedZoom));
        }
    }
}

class AutoFitFitState extends AutoFitState {
    constructor(
        public readonly view: FitView,
        private readonly savedState?: FixedState,
        private readonly savedZoom?: number
    ) {
        super();
    }

    public moveTo(x: number, y: number): FixedNormalState {
        return new FixedNormalState(this.view.moveTo(x, y));
    }

    public resize(width: number, height: number): AutoFitState {
        if (viewHasEnoughSpaceWithSize(this.view, width, height)) {
            return new AutoFit100PercentState(
                this.view.toIdentityCenterWithSize(width, height),
                this.savedState,
                this.savedZoom
            );
        } else {
            this.view.resize(width, height);

            return this;
        }
    }

    public resizeContent(width: number, height: number): AutoFitState {
        if (viewHasEnoughSpaceWithContentSize(this.view, width, height)) {
            return new AutoFit100PercentState(
                this.view.toIdentityCenterWithContentSize(width, height),
                this.savedState,
                this.savedZoom
            );
        } else {
            this.view.resizeContent(width, height);

            return this;
        }
    }

    public setZoomMode(zoomMode: ZoomMode): IViewState {
        switch (zoomMode) {
            case ZoomMode.Fixed:
                if (this.savedState === undefined) {
                    return FixedState.create(
                        this.view.width,
                        this.view.height,
                        this.view.contentWidth,
                        this.view.contentHeight,
                        this.view.contentMargin
                    );
                } else {
                    this.savedState.resizeAll(
                        this.view.width,
                        this.view.height,
                        this.view.contentWidth,
                        this.view.contentHeight,
                        this.view.contentMargin
                    );

                    return this.savedState;
                }
            case ZoomMode.Fit:
                return new FitState(this.view, this.savedState, this.savedZoom);
            case ZoomMode.AutoFit:
                return this;
        }
    }

    public toggleOverview(x: number, y: number): Fixed100PercentState {
        return new Fixed100PercentState(this.view.toIdentity(x, y), this.savedZoom);
    }
}

export interface IViewEventListener {
    onZoomModeChanged(zoomMode: ZoomMode): void;
    onLayoutChanged(x: number, y: number, zoom: number): void;
}

export class Controller {
    private state: IViewState;

    public constructor(
        width: number,
        height: number,
        contentWidth: number,
        contentHeight: number,
        contentMargin: number,
        private readonly viewEventListener: IViewEventListener,
        private readonly zoomStep: number,
        zoomMode: ZoomMode
    ) {
        switch (zoomMode) {
            case ZoomMode.Fixed:
                this.state = FixedState.create(width, height, contentWidth, contentHeight, contentMargin);
                break;
            case ZoomMode.Fit:
                this.state = new FitState(new FitView(width, height, contentWidth, contentHeight, contentMargin));
                break;
            case ZoomMode.AutoFit:
                this.state = AutoFitState.create(width, height, contentWidth, contentHeight, contentMargin);
                break;
            default:
                throw new Error();
        }

        this.notifyLayoutChanged();
        this.notifyZoomingModeChanged();
    }

    public beginDrag(x: number, y: number): (x: number, y: number) => void {
        const offsetX = this.state.view.contentX - x;
        const offsetY = this.state.view.contentY - y;

        return (x1, y1) => {
            this.state = this.state.moveTo(offsetX + x1, offsetY + y1);

            this.notifyLayoutChanged();
            this.notifyZoomingModeChanged();
        };
    }

    public resize(width: number, height: number): void {
        this.state = this.state.resize(width, height);

        this.notifyLayoutChanged();
    }

    public resizeContent(width: number, height: number): void {
        this.state = this.state.resizeContent(width, height);

        this.notifyLayoutChanged();
    }

    public setZoomMode(zoomMode: ZoomMode): void {
        this.state = this.state.setZoomMode(zoomMode);

        this.notifyLayoutChanged();
        this.notifyZoomingModeChanged();
    }

    public toggleOverview(x: number, y: number): void {
        this.state = this.state.toggleOverview(x, y);

        this.notifyLayoutChanged();
        this.notifyZoomingModeChanged();
    }

    public zoomIn(x: number, y: number): void {
        this.zoomTo(x, y, this.state.view.zoom * this.zoomStep);
    }

    public zoomOut(x: number, y: number): void {
        this.zoomTo(x, y, this.state.view.zoom / this.zoomStep);
    }

    private zoomTo(x: number, y: number, value: number): void {
        this.state = this.state.zoomTo(x, y, value);

        this.notifyLayoutChanged();
        this.notifyZoomingModeChanged();
    }

    private notifyLayoutChanged(): void {
        this.viewEventListener.onLayoutChanged(
            this.state.view.contentX,
            this.state.view.contentY,
            this.state.view.zoom
        );
    }

    private notifyZoomingModeChanged(): void {
        this.viewEventListener.onZoomModeChanged(this.state.zoomMode);
    }
}
