import {
    FitView,
    FixedView,
    IdentityCenterView,
    IdentityView,
    IFitViewArchive,
    IIdentityCenterViewArchive,
    IIdentityViewArchive,
    IView,
    IViewArchive,
    View
} from "./view";

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

    serialize(): StateArchive;
}

abstract class FixedState implements IViewState {
    public static fromArchive(archive: FixedStateArchive): FixedState {
        switch (archive.type) {
            case "FixedNormalState":
                return FixedNormalState.fromArchive(archive);
            case "Fixed100PercentState":
                return Fixed100PercentState.fromArchive(archive);
        }
    }

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

    public abstract serialize(): FixedStateArchive;
}

interface IFixedNormalStateArchive {
    type: "FixedNormalState";
    view: IViewArchive;
}

class FixedNormalState extends FixedState {
    public static fromArchive(archive: IFixedNormalStateArchive): FixedNormalState {
        return new FixedNormalState(View.fromArchive(archive.view));
    }

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

    public serialize(): IFixedNormalStateArchive {
        return {
            type: "FixedNormalState",
            view: this.view.serialize()
        };
    }
}

interface IFixed100PercentStateArchive {
    type: "Fixed100PercentState";
    view: IIdentityViewArchive;
    savedZoom: number;
}

class Fixed100PercentState extends FixedState {
    public static fromArchive(archive: IFixed100PercentStateArchive): Fixed100PercentState {
        return new Fixed100PercentState(IdentityView.fromArchive(archive.view), archive.savedZoom);
    }

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

    public serialize(): IFixed100PercentStateArchive {
        return {
            savedZoom: this.savedZoom,
            type: "Fixed100PercentState",
            view: this.view.serialize()
        };
    }
}

type FixedStateArchive = IFixedNormalStateArchive | IFixed100PercentStateArchive;

interface IFitStateArchive {
    type: "FitState";
    view: IFitViewArchive;
    savedState: FixedStateArchive | undefined;
    savedZoom: number;
}

class FitState implements IViewState {
    public static fromArchive(archive: IFitStateArchive): FitState {
        return new FitState(
            FitView.fromArchive(archive.view),
            archive.savedState === undefined ? undefined : FixedState.fromArchive(archive.savedState),
            archive.savedZoom
        );
    }

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

    public serialize(): IFitStateArchive {
        return {
            savedState: this.savedState === undefined ? undefined : this.savedState.serialize(),
            savedZoom: this.savedZoom,
            type: "FitState",
            view: this.view.serialize()
        };
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

    public abstract serialize(): AutoFitStateArchive;
}

interface IAutoFit100PercentStateArchive {
    type: "AutoFit100PercentState";
    view: IIdentityCenterViewArchive;
    savedState: FixedStateArchive | undefined;
    savedZoom: number;
}

class AutoFit100PercentState extends AutoFitState {
    public static fromArchive(archive: IAutoFit100PercentStateArchive): AutoFit100PercentState {
        return new AutoFit100PercentState(
            IdentityCenterView.fromArchive(archive.view),
            archive.savedState === undefined ? undefined : FixedState.fromArchive(archive.savedState),
            archive.savedZoom
        );
    }

    public constructor(
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

    public serialize(): IAutoFit100PercentStateArchive {
        return {
            savedState: this.savedState === undefined ? undefined : this.savedState.serialize(),
            savedZoom: this.savedZoom,
            type: "AutoFit100PercentState",
            view: this.view.serialize()
        };
    }
}

interface IAutoFitFitStateArchive {
    type: "AutoFitFitState";
    view: IFitViewArchive;
    savedState: FixedStateArchive | undefined;
    savedZoom: number;
}

class AutoFitFitState extends AutoFitState {
    public static fromArchive(archive: IAutoFitFitStateArchive): AutoFitFitState {
        return new AutoFitFitState(
            FitView.fromArchive(archive.view),
            archive.savedState === undefined ? undefined : FixedState.fromArchive(archive.savedState),
            archive.savedZoom
        );
    }

    public constructor(
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

    public serialize(): IAutoFitFitStateArchive {
        return {
            savedState: this.savedState === undefined ? undefined : this.savedState.serialize(),
            savedZoom: this.savedZoom,
            type: "AutoFitFitState",
            view: this.view.serialize()
        };
    }
}

export interface IViewEventListener {
    onZoomModeChanged(zoomMode: ZoomMode): void;
    onLayoutChanged(x: number, y: number, width: number, height: number, zoom: number): void;
}

type AutoFitStateArchive = IAutoFit100PercentStateArchive | IAutoFitFitStateArchive;
type StateArchive = FixedStateArchive | IFitStateArchive | AutoFitStateArchive;

function stateFromArchive(archive: StateArchive): IViewState {
    switch (archive.type) {
        case "FixedNormalState":
            return FixedNormalState.fromArchive(archive);
        case "Fixed100PercentState":
            return Fixed100PercentState.fromArchive(archive);
        case "FitState":
            return FitState.fromArchive(archive);
        case "AutoFit100PercentState":
            return AutoFit100PercentState.fromArchive(archive);
        case "AutoFitFitState":
            return AutoFitFitState.fromArchive(archive);
    }
}

export interface IControllerArchive {
    state: StateArchive;
    zoomStep: number;
    offsetStep: number;
}

export class Controller {
    public static create(
        width: number,
        height: number,
        contentWidth: number,
        contentHeight: number,
        contentMargin: number,
        viewEventListener: IViewEventListener,
        zoomStep: number,
        offsetStep: number,
        zoomMode: ZoomMode
    ): Controller {
        let state: IViewState;

        switch (zoomMode) {
            case ZoomMode.Fixed:
                state = FixedState.create(
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

                state = new FitState(view, undefined, view.zoom);
                break;
            case ZoomMode.AutoFit:
                state = AutoFitState.create(width, height, contentWidth, contentHeight, contentMargin);
                break;
            default:
                throw new Error();
        }

        return new Controller(state, zoomStep, offsetStep, viewEventListener);
    }

    public static fromArchive(archive: IControllerArchive, viewEventListener: IViewEventListener): Controller {
        return new Controller(stateFromArchive(archive.state), archive.zoomStep, archive.offsetStep, viewEventListener);
    }

    public constructor(
        private state: IViewState,
        private readonly zoomStep: number,
        private readonly offsetStep: number,
        private readonly viewEventListener: IViewEventListener
    ) {
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
            this.toggleOverviewCenter();
        }
    }

    public moveDown(): void {
        const view = this.state.view;

        this.moveTo(view.contentX, view.contentY + this.offsetStep);
    }

    public moveLeft(): void {
        const view = this.state.view;

        this.moveTo(view.contentX - this.offsetStep, view.contentY);
    }

    public moveRight(): void {
        const view = this.state.view;

        this.moveTo(view.contentX + this.offsetStep, view.contentY);
    }

    public moveUp(): void {
        const view = this.state.view;

        this.moveTo(view.contentX, view.contentY - this.offsetStep);
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

    public toggleOverviewCenter(): void {
        const view = this.state.view;

        this.toggleOverview(view.width / 2, view.height / 2);
    }

    public zoomIn(x: number, y: number): void {
        this.zoomTo(x, y, this.state.view.zoom * this.zoomStep);
    }

    public zoomInCenter(): void {
        const view = this.state.view;

        this.zoomTo(view.width / 2, view.height / 2, this.state.view.zoom * this.zoomStep);
    }

    public zoomOut(x: number, y: number): void {
        this.zoomTo(x, y, this.state.view.zoom / this.zoomStep);
    }

    public zoomOutCenter(): void {
        const view = this.state.view;

        this.zoomTo(view.width / 2, view.height / 2, this.state.view.zoom / this.zoomStep);
    }

    public serialize(): IControllerArchive {
        return {
            offsetStep: this.offsetStep,
            state: this.state.serialize(),
            zoomStep: this.zoomStep
        };
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
