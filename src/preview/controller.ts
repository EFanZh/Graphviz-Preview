import { FitView, FixedView, IdentityCenterView, IdentityView, IView, View } from "./view";

const defaultNormalZoom = 2;

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
        contentMargin: number,
        savedZoom: number
    ): FixedState {
        const contentMargin2 = contentMargin * 2;

        if (hasEnoughSpace(contentWidth, contentHeight, width - contentMargin2, height - contentMargin2)) {
            return new Fixed100PercentState(
                IdentityView.createCenter(width, height, contentWidth, contentHeight, contentMargin),
                savedZoom
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

    public toggleOverview(x: number, y: number): Fixed100PercentState {
        return new Fixed100PercentState(this.view.toIdentity(x, y), this.view.zoom);
    }

    public zoomTo(x: number, y: number, zoom: number): FixedNormalState {
        this.view.zoomTo(x, y, zoom);

        return this;
    }
}

class Fixed100PercentState extends FixedState {
    public constructor(public readonly view: IdentityView, private readonly savedZoom: number) {
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

    public toggleOverview(x: number, y: number): FixedNormalState {
        return new FixedNormalState(this.view.zoomTo(x, y, this.savedZoom));
    }

    public zoomTo(x: number, y: number, zoom: number): FixedNormalState {
        return new FixedNormalState(this.view.zoomTo(x, y, zoom));
    }
}

class FitState implements IViewState {
    public readonly zoomMode = ZoomMode.Fit;

    public constructor(
        public readonly view: FitView,
        private readonly savedState: FixedState | undefined,
        private readonly savedZoom: number
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
                        this.view.contentMargin,
                        this.view.zoom
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
        return new Fixed100PercentState(this.view.toIdentity(x, y), this.view.zoom);
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
            const view = new IdentityCenterView(width, height, contentWidth, contentHeight, contentMargin);

            return new AutoFit100PercentState(view, undefined, defaultNormalZoom);
        } else {
            const view = new FitView(width, height, contentWidth, contentHeight, contentMargin);

            return new AutoFitFitState(view, undefined, view.zoom);
        }
    }

    public static fromFixedView(view: FixedView, savedState: FixedState | undefined, savedZoom: number): AutoFitState {
        if (viewHasEnoughSpace(view)) {
            return new AutoFit100PercentState(view.toIdentityCenter(), savedState, savedZoom);
        } else {
            return new AutoFitFitState(view.toFit(), savedState, savedZoom);
        }
    }

    public static fromFitView(view: FitView, savedState: FixedState | undefined, savedZoom: number): AutoFitState {
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
        private readonly savedState: FixedState | undefined,
        private readonly savedZoom: number
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
                        this.view.contentMargin,
                        this.savedZoom
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

    public toggleOverview(x: number, y: number): FixedNormalState {
        return new FixedNormalState(this.view.zoomTo(x, y, this.savedZoom));
    }
}

class AutoFitFitState extends AutoFitState {
    constructor(
        public readonly view: FitView,
        private readonly savedState: FixedState | undefined,
        private readonly savedZoom: number
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
                        this.view.contentMargin,
                        this.view.zoom
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
        return new Fixed100PercentState(this.view.toIdentity(x, y), this.view.zoom);
    }
}

export interface IViewEventListener {
    onZoomModeChanged(zoomMode: ZoomMode): void;
    onLayoutChanged(x: number, y: number, width: number, height: number, zoom: number): void;
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
                this.state = FixedState.create(
                    width,
                    height,
                    contentWidth,
                    contentHeight,
                    contentMargin,
                    defaultNormalZoom
                );
                break;
            case ZoomMode.Fit:
                const view = new FitView(width, height, contentWidth, contentHeight, contentMargin);

                this.state = new FitState(view, undefined, view.zoom);
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

        return (x1, y1) => this.moveTo(offsetX + x1, offsetY + y1);
    }

    public makeCenter(): void {
        const view = this.state.view;

        if (!view.isCenter) {
            this.moveTo(
                (view.width - view.contentWidth * view.zoom) / 2,
                (view.height - view.contentHeight * view.zoom) / 2
            );
        }
    }

    public makeIdentity(): void {
        const view = this.state.view;

        if (!view.isIdentity) {
            this.zoomTo(view.width / 2, view.height / 2, 1);
        }
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

    private moveTo(x: number, y: number): void {
        this.state = this.state.moveTo(x, y);

        this.notifyLayoutChanged();
        this.notifyZoomingModeChanged();
    }

    private zoomTo(x: number, y: number, value: number): void {
        this.state = this.state.zoomTo(x, y, value);

        this.notifyLayoutChanged();
        this.notifyZoomingModeChanged();
    }

    private notifyLayoutChanged(): void {
        const view = this.state.view;

        this.viewEventListener.onLayoutChanged(
            view.contentX,
            view.contentY,
            view.contentWidth,
            view.contentHeight,
            view.zoom
        );
    }

    private notifyZoomingModeChanged(): void {
        this.viewEventListener.onZoomModeChanged(this.state.zoomMode);
    }
}
