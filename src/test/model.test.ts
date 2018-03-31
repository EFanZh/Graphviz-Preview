import * as assert from "assert";
import * as model from "../model";

const floatCheckEpsilon = 1e-12;
const testRecursionDepth = 7;

class FakeView {
    private widthValue: number;
    private heightValue: number;
    private contentWidthValue: number;
    private contentHeightValue: number;
    private contentMarginValue: number;
    private contentXValue: number = -1;
    private contentYValue: number = -1;
    private zoomValue: number = -1;
    private zoomModeValue: model.ZoomMode = model.ZoomMode.Fixed;
    private controller: model.Controller;

    constructor(
        width: number,
        height: number,
        contentWidth: number,
        contentHeight: number,
        contentMargin: number,
        public readonly zoomStep: number,
        zoomMode: model.ZoomMode
    ) {
        this.widthValue = width;
        this.heightValue = height;
        this.contentWidthValue = contentWidth;
        this.contentHeightValue = contentHeight;
        this.contentMarginValue = contentMargin;

        const viewEventListener = new class implements model.IViewEventListener {
            constructor(private fakeView: FakeView) {
            }

            public onZoomModeChanged(zoomMode1: model.ZoomMode): void {
                this.fakeView.zoomModeValue = zoomMode1;
            }

            public onLayoutChanged(x: number, y: number, zoom: number): void {
                this.fakeView.contentXValue = x;
                this.fakeView.contentYValue = y;
                this.fakeView.zoomValue = zoom;
            }
        }(this);

        this.controller = new model.Controller(
            width,
            height,
            contentWidth,
            contentHeight,
            contentMargin,
            viewEventListener,
            zoomStep,
            zoomMode
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

    public get zoomMode(): model.ZoomMode {
        return this.zoomModeValue;
    }

    public beginDrag(x: number, y: number): (x: number, y: number) => void {
        return this.controller.beginDrag(x, y);
    }

    public resize(width: number, height: number): void {
        this.widthValue = width;
        this.heightValue = height;

        this.controller.resize(width, height);
    }

    public resizeContent(width: number, height: number): void {
        this.contentWidthValue = width;
        this.contentHeightValue = height;

        this.controller.resizeContent(width, height);
    }

    public setZoomMode(zoomMode: model.ZoomMode): void {
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

    public get hasEnoughSpace(): boolean {
        const contentMargin = this.contentMargin * 2;

        return this.contentWidth < this.width - contentMargin && this.contentHeight < this.height - contentMargin;
    }

    public hasEnoughSpaceWithSize(width: number, height: number): boolean {
        const contentMargin = this.contentMargin * 2;

        return this.contentWidth < width - contentMargin && this.contentHeight < height - contentMargin;
    }

    public hasEnoughSpaceWithContentSize(width: number, height: number): boolean {
        const contentMargin = this.contentMargin * 2;

        return width < this.width - contentMargin && height < this.height - contentMargin;
    }
}

function assertEqual(actual: number, expected: number): void {
    assert.equal(actual, expected);
}

function assertAlmostEqual(actual: number, expected: number): void {
    assert(Math.abs(actual - expected) < floatCheckEpsilon, `Actual: ${actual}, Expected: ${expected}.`);
}

function makeCreator(creator: () => FakeView, action: (fakeView: FakeView) => void): () => FakeView {
    return () => {
        const fakeView = creator();

        action(fakeView);

        return fakeView;
    };
}

type SavedState = (creator: () => FakeView, recursionDepth: number) => void;

function saveState(
    referenceViewCreator: () => FakeView,
    checker: (creator: () => FakeView, contentX: number, contentY: number, zoom: number, recursionDepth: number) => void
): SavedState {
    const referenceView = referenceViewCreator();

    return (creator: () => FakeView, recursionDepth: number) => {
        const fakeView = creator();

        referenceView.resize(fakeView.width, fakeView.height);
        referenceView.resizeContent(fakeView.contentWidth, fakeView.contentHeight);

        checker(creator, referenceView.contentX, referenceView.contentY, referenceView.zoom, recursionDepth);
    };
}

// Fixed Normal State.

function checkFixedNormalState(
    creator: () => FakeView,
    expectedX: number,
    expectedY: number,
    expectedZoom: number,
    recursionDepth: number
): void {
    if (recursionDepth > 0) {
        --recursionDepth;

        const fakeView = creator();

        assertEqual(fakeView.zoomMode, model.ZoomMode.Fixed);
        assertAlmostEqual(fakeView.contentX, expectedX);
        assertAlmostEqual(fakeView.contentY, expectedY);
        assertAlmostEqual(fakeView.zoom, expectedZoom);

        // Drag.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.beginDrag(10, 20)(30, 50)),
            fakeView.contentX + 20,
            fakeView.contentY + 30,
            fakeView.zoom,
            recursionDepth
        );

        // Resize.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.resize(fakeView.width * 1.1, fakeView.height * 1.2)),
            fakeView.contentX + fakeView.width * 0.05,
            fakeView.contentY + fakeView.height * 0.1,
            fakeView.zoom,
            recursionDepth
        );

        // Resize content.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.resizeContent(fakeView.contentWidth * 1.1, fakeView.contentHeight * 1.2)),
            fakeView.contentX * 1.1 - fakeView.width * 0.05,
            fakeView.contentY * 1.2 - fakeView.height * 0.1,
            fakeView.zoom,
            recursionDepth
        );

        const savedState = saveState(creator, (c, x, y, z, d) => checkFixedNormalState(c, x, y, z, d));

        // Set Zoom Mode.
        {
            // Fixed.
            checkFixedNormalState(
                makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fixed)),
                fakeView.contentX,
                fakeView.contentY,
                fakeView.zoom,
                recursionDepth
            );

            // Fit.
            checkFitStateWithSavedStateAndZoom(
                makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fit)),
                savedState,
                fakeView.zoom,
                recursionDepth
            );

            // Auto Fit.
            {
                const checker = fakeView.hasEnoughSpace ?
                    checkAutoFit100PercentStateWithSavedStateAndZoom :
                    checkAutoFitFitStateWithSavedStateAndZoom;

                checker(
                    makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.AutoFit)),
                    savedState,
                    fakeView.zoom,
                    recursionDepth
                );
            }
        }

        // Toggle overview.
        checkFitStateWithSavedStateAndZoom(
            makeCreator(creator, (v) => v.toggleOverview(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            savedState,
            fakeView.zoom,
            recursionDepth
        );

        // Zoom in.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomIn(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - fakeView.zoomStep * 0.1),
            fakeView.contentY * (1.2 - fakeView.zoomStep * 0.2),
            fakeView.zoom * fakeView.zoomStep,
            recursionDepth
        );

        // Zoom out.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomOut(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - 0.1 / fakeView.zoomStep),
            fakeView.contentY * (1.2 - 0.2 / fakeView.zoomStep),
            fakeView.zoom / fakeView.zoomStep,
            recursionDepth
        );
    }
}

// Fixed 100% State.

function checkFixed100PercentState(
    creator: () => FakeView,
    expectedX: number,
    expectedY: number,
    recursionDepth: number
): void {
    if (recursionDepth > 0) {
        --recursionDepth;

        const fakeView = creator();

        assertEqual(fakeView.zoomMode, model.ZoomMode.Fixed);
        assertAlmostEqual(fakeView.contentX, expectedX);
        assertAlmostEqual(fakeView.contentY, expectedY);
        assertAlmostEqual(fakeView.zoom, 1);

        // Drag.
        checkFixed100PercentState(
            makeCreator(creator, (v) => v.beginDrag(10, 20)(30, 50)),
            fakeView.contentX + 20,
            fakeView.contentY + 30,
            recursionDepth
        );

        // Resize.
        checkFixed100PercentState(
            makeCreator(creator, (v) => v.resize(fakeView.width * 1.1, fakeView.height * 1.2)),
            fakeView.contentX + fakeView.width * 0.05,
            fakeView.contentY + fakeView.height * 0.1,
            recursionDepth
        );

        // Resize content.
        checkFixed100PercentState(
            makeCreator(creator, (v) => v.resizeContent(fakeView.contentWidth * 1.1, fakeView.contentHeight * 1.2)),
            fakeView.contentX * 1.1 - fakeView.width * 0.05,
            fakeView.contentY * 1.2 - fakeView.height * 0.1,
            recursionDepth
        );

        const savedState = saveState(creator, (c, x, y, _, d) => checkFixed100PercentState(c, x, y, d));

        // Set Zoom Mode.
        {
            // Fixed.
            checkFixed100PercentState(
                makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fixed)),
                fakeView.contentX,
                fakeView.contentY,
                recursionDepth
            );

            // Fit.
            checkFitStateWithSavedState(
                makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fit)),
                savedState,
                recursionDepth
            );

            // Auto Fit.
            {
                const checker = fakeView.hasEnoughSpace ?
                    checkAutoFit100PercentStateWithSavedState :
                    checkAutoFitFitStateWithSavedState;

                checker(makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.AutoFit)), savedState, recursionDepth);
            }
        }

        // Toggle overview.
        checkFitStateWithSavedState(
            makeCreator(creator, (v) => v.toggleOverview(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            savedState,
            recursionDepth
        );

        // Zoom in.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomIn(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - fakeView.zoomStep * 0.1),
            fakeView.contentY * (1.2 - fakeView.zoomStep * 0.2),
            fakeView.zoomStep,
            recursionDepth
        );

        // Zoom out.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomOut(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - 0.1 / fakeView.zoomStep),
            fakeView.contentY * (1.2 - 0.2 / fakeView.zoomStep),
            1 / fakeView.zoomStep,
            recursionDepth
        );
    }
}

function checkFixed100PercentStateWithSavedZoom(
    creator: () => FakeView,
    expectedX: number,
    expectedY: number,
    savedZoom: number,
    recursionDepth: number
): void {
    if (recursionDepth > 0) {
        --recursionDepth;

        const fakeView = creator();

        assertEqual(fakeView.zoomMode, model.ZoomMode.Fixed);
        assertAlmostEqual(fakeView.contentX, expectedX);
        assertAlmostEqual(fakeView.contentY, expectedY);
        assertAlmostEqual(fakeView.zoom, 1);

        // Drag.
        checkFixed100PercentStateWithSavedZoom(
            makeCreator(creator, (v) => v.beginDrag(10, 20)(30, 50)),
            fakeView.contentX + 20,
            fakeView.contentY + 30,
            savedZoom,
            recursionDepth
        );

        // Resize.
        checkFixed100PercentStateWithSavedZoom(
            makeCreator(creator, (v) => v.resize(fakeView.width * 1.1, fakeView.height * 1.2)),
            fakeView.contentX + fakeView.width * 0.05,
            fakeView.contentY + fakeView.height * 0.1,
            savedZoom,
            recursionDepth
        );

        // Resize content.
        checkFixed100PercentStateWithSavedZoom(
            makeCreator(creator, (v) => v.resizeContent(fakeView.contentWidth * 1.1, fakeView.contentHeight * 1.2)),
            fakeView.contentX * 1.1 - fakeView.width * 0.05,
            fakeView.contentY * 1.2 - fakeView.height * 0.1,
            savedZoom,
            recursionDepth
        );

        const savedState = saveState(
            creator,
            (c, x, y, _, d) => checkFixed100PercentStateWithSavedZoom(c, x, y, savedZoom, d)
        );

        // Set Zoom Mode.
        {
            // Fixed.
            checkFixed100PercentStateWithSavedZoom(
                makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fixed)),
                fakeView.contentX,
                fakeView.contentY,
                savedZoom,
                recursionDepth
            );

            // Fit.
            checkFitStateWithSavedStateAndZoom(
                makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fit)),
                savedState,
                savedZoom,
                recursionDepth
            );

            // Auto Fit.
            {
                const checker = fakeView.hasEnoughSpace ?
                    checkAutoFit100PercentStateWithSavedStateAndZoom :
                    checkAutoFitFitStateWithSavedStateAndZoom;

                checker(
                    makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.AutoFit)),
                    savedState,
                    savedZoom,
                    recursionDepth
                );
            }
        }

        // Toggle overview.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.toggleOverview(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - savedZoom * 0.1),
            fakeView.contentY * (1.2 - savedZoom * 0.2),
            savedZoom,
            recursionDepth
        );

        // Zoom in.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomIn(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - fakeView.zoomStep * 0.1),
            fakeView.contentY * (1.2 - fakeView.zoomStep * 0.2),
            fakeView.zoomStep,
            recursionDepth
        );

        // Zoom out.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomOut(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - 0.1 / fakeView.zoomStep),
            fakeView.contentY * (1.2 - 0.2 / fakeView.zoomStep),
            1 / fakeView.zoomStep,
            recursionDepth
        );
    }
}

function checkFit(fakeView: FakeView): void {
    const expectedZoom = Math.min(
        (fakeView.width - fakeView.contentMargin * 2) / fakeView.contentWidth,
        (fakeView.height - fakeView.contentMargin * 2) / fakeView.contentHeight
    );

    const expectedX = (fakeView.width - fakeView.contentWidth * expectedZoom) / 2;
    const expectedY = (fakeView.height - fakeView.contentHeight * expectedZoom) / 2;

    assertAlmostEqual(fakeView.contentX, expectedX);
    assertAlmostEqual(fakeView.contentY, expectedY);
    assertAlmostEqual(fakeView.zoom, expectedZoom);
}

function checkInitialFixedState(creator: () => FakeView, fakeView: FakeView, recursionDepth: number): void {
    if (fakeView.hasEnoughSpace) {
        checkFixed100PercentState(
            creator,
            (fakeView.width - fakeView.contentWidth) / 2,
            (fakeView.height - fakeView.contentHeight) / 2,
            recursionDepth
        );
    } else {
        const contentMargin = fakeView.contentMargin * 2;
        const zoom = Math.min(
            (fakeView.width - contentMargin) / fakeView.contentWidth,
            (fakeView.height - contentMargin) / fakeView.contentHeight
        );

        checkFixedNormalState(
            creator,
            (fakeView.width - fakeView.contentWidth * zoom) / 2,
            (fakeView.height - fakeView.contentHeight * zoom) / 2,
            zoom,
            recursionDepth
        );
    }
}

// Fit State.

function checkFitState(creator: () => FakeView, recursionDepth: number): void {
    if (recursionDepth > 0) {
        --recursionDepth;

        const fakeView = creator();

        assertEqual(fakeView.zoomMode, model.ZoomMode.Fit);

        checkFit(fakeView);

        // Drag.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.beginDrag(10, 20)(30, 50)),
            fakeView.contentX + 20,
            fakeView.contentY + 30,
            fakeView.zoom,
            recursionDepth
        );

        // Resize.
        checkFitState(
            makeCreator(creator, (v) => v.resize(fakeView.width * 1.1, fakeView.height * 1.2)),
            recursionDepth
        );

        // Resize content.
        checkFitState(
            makeCreator(creator, (v) => v.resizeContent(fakeView.contentWidth * 1.1, fakeView.contentHeight * 1.2)),
            recursionDepth
        );

        // Set Zoom Mode.
        {
            // Fixed.
            checkInitialFixedState(
                makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fixed)),
                fakeView,
                recursionDepth
            );

            // Fit.
            checkFitState(makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fit)), recursionDepth);

            // Auto Fit.
            {
                const checker = fakeView.hasEnoughSpace ? checkAutoFit100PercentState : checkAutoFitFitState;

                checker(makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.AutoFit)), recursionDepth);
            }
        }

        // Toggle overview.
        checkFixed100PercentState(
            makeCreator(creator, (v) => v.toggleOverview(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - 0.1 / fakeView.zoom),
            fakeView.contentY * (1.2 - 0.2 / fakeView.zoom),
            recursionDepth
        );

        // Zoom in.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomIn(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - fakeView.zoomStep * 0.1),
            fakeView.contentY * (1.2 - fakeView.zoomStep * 0.2),
            fakeView.zoom * fakeView.zoomStep,
            recursionDepth
        );

        // Zoom out.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomOut(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - 0.1 / fakeView.zoomStep),
            fakeView.contentY * (1.2 - 0.2 / fakeView.zoomStep),
            fakeView.zoom / fakeView.zoomStep,
            recursionDepth
        );
    }
}

function checkFitStateWithSavedState(creator: () => FakeView, savedState: SavedState, recursionDepth: number): void {
    if (recursionDepth > 0) {
        --recursionDepth;

        const fakeView = creator();

        assertEqual(fakeView.zoomMode, model.ZoomMode.Fit);

        checkFit(fakeView);

        // Drag.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.beginDrag(10, 20)(30, 50)),
            fakeView.contentX + 20,
            fakeView.contentY + 30,
            fakeView.zoom,
            recursionDepth
        );

        // Resize.
        checkFitStateWithSavedState(
            makeCreator(creator, (v) => v.resize(fakeView.width * 1.1, fakeView.height * 1.2)),
            savedState,
            recursionDepth
        );

        // Set Zoom Mode.
        {
            // Fixed.
            savedState(makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fixed)), recursionDepth);

            // Fit.
            checkFitStateWithSavedState(
                makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fit)),
                savedState,
                recursionDepth
            );

            // Auto Fit.
            {
                const checker = fakeView.hasEnoughSpace ?
                    checkAutoFit100PercentStateWithSavedState :
                    checkAutoFitFitStateWithSavedState;

                checker(makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.AutoFit)), savedState, recursionDepth);
            }
        }

        // Resize content.
        checkFitStateWithSavedState(
            makeCreator(creator, (v) => v.resizeContent(fakeView.contentWidth * 1.1, fakeView.contentHeight * 1.2)),
            savedState,
            recursionDepth
        );

        // Toggle overview.
        checkFixed100PercentState(
            makeCreator(creator, (v) => v.toggleOverview(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - 0.1 / fakeView.zoom),
            fakeView.contentY * (1.2 - 0.2 / fakeView.zoom),
            recursionDepth
        );

        // Zoom in.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomIn(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - fakeView.zoomStep * 0.1),
            fakeView.contentY * (1.2 - fakeView.zoomStep * 0.2),
            fakeView.zoom * fakeView.zoomStep,
            recursionDepth
        );

        // Zoom out.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomOut(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - 0.1 / fakeView.zoomStep),
            fakeView.contentY * (1.2 - 0.2 / fakeView.zoomStep),
            fakeView.zoom / fakeView.zoomStep,
            recursionDepth
        );
    }
}

function checkFitStateWithSavedStateAndZoom(
    creator: () => FakeView,
    savedState: SavedState,
    savedZoom: number,
    recursionDepth: number
): void {
    if (recursionDepth > 0) {
        --recursionDepth;

        const fakeView = creator();

        assertEqual(fakeView.zoomMode, model.ZoomMode.Fit);

        checkFit(fakeView);

        // Drag.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.beginDrag(10, 20)(30, 50)),
            fakeView.contentX + 20,
            fakeView.contentY + 30,
            fakeView.zoom,
            recursionDepth
        );

        // Resize.
        checkFitStateWithSavedStateAndZoom(
            makeCreator(creator, (v) => v.resize(fakeView.width * 1.1, fakeView.height * 1.2)),
            savedState,
            savedZoom,
            recursionDepth
        );

        // Resize content.
        checkFitStateWithSavedStateAndZoom(
            makeCreator(creator, (v) => v.resizeContent(fakeView.contentWidth * 1.1, fakeView.contentHeight * 1.2)),
            savedState,
            savedZoom,
            recursionDepth
        );

        // Set Zoom Mode.
        {
            // Fixed.
            savedState(makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fixed)), recursionDepth);

            // Fit.
            checkFitStateWithSavedStateAndZoom(
                makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fit)),
                savedState,
                savedZoom,
                recursionDepth
            );

            // Auto Fit.
            {
                const checker = fakeView.hasEnoughSpace ?
                    checkAutoFit100PercentStateWithSavedStateAndZoom :
                    checkAutoFitFitStateWithSavedStateAndZoom;

                checker(
                    makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.AutoFit)),
                    savedState,
                    savedZoom,
                    recursionDepth
                );
            }
        }

        // Toggle overview.
        checkFixed100PercentStateWithSavedZoom(
            makeCreator(creator, (v) => v.toggleOverview(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - 0.1 / fakeView.zoom),
            fakeView.contentY * (1.2 - 0.2 / fakeView.zoom),
            savedZoom,
            recursionDepth
        );

        // Zoom in.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomIn(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - fakeView.zoomStep * 0.1),
            fakeView.contentY * (1.2 - fakeView.zoomStep * 0.2),
            fakeView.zoom * fakeView.zoomStep,
            recursionDepth
        );

        // Zoom out.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomOut(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - 0.1 / fakeView.zoomStep),
            fakeView.contentY * (1.2 - 0.2 / fakeView.zoomStep),
            fakeView.zoom / fakeView.zoomStep,
            recursionDepth
        );
    }
}

function checkFitStateWithSavedZoom(creator: () => FakeView, savedZoom: number, recursionDepth: number): void {
    if (recursionDepth > 0) {
        --recursionDepth;

        const fakeView = creator();

        assertEqual(fakeView.zoomMode, model.ZoomMode.Fit);

        checkFit(fakeView);

        // Drag.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.beginDrag(10, 20)(30, 50)),
            fakeView.contentX + 20,
            fakeView.contentY + 30,
            fakeView.zoom,
            recursionDepth
        );

        // Resize.
        checkFitStateWithSavedZoom(
            makeCreator(creator, (v) => v.resize(fakeView.width * 1.1, fakeView.height * 1.2)),
            savedZoom,
            recursionDepth
        );

        // Resize content.
        checkFitStateWithSavedZoom(
            makeCreator(creator, (v) => v.resizeContent(fakeView.contentWidth * 1.1, fakeView.contentHeight * 1.2)),
            savedZoom,
            recursionDepth
        );

        // Set Zoom Mode.
        {
            // Fixed.
            checkInitialFixedState(
                makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fixed)),
                fakeView,
                recursionDepth
            );

            // Fit.
            checkFitStateWithSavedZoom(
                makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fit)),
                savedZoom,
                recursionDepth
            );

            // Auto Fit.
            {
                const checker = fakeView.hasEnoughSpace ?
                    checkAutoFit100PercentStateWithSavedZoom :
                    checkAutoFitFitStateWithSavedZoom;

                checker(makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.AutoFit)), savedZoom, recursionDepth);
            }
        }

        // Toggle overview.
        checkFixed100PercentStateWithSavedZoom(
            makeCreator(creator, (v) => v.toggleOverview(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - 0.1 / fakeView.zoom),
            fakeView.contentY * (1.2 - 0.2 / fakeView.zoom),
            savedZoom,
            recursionDepth
        );

        // Zoom in.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomIn(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - fakeView.zoomStep * 0.1),
            fakeView.contentY * (1.2 - fakeView.zoomStep * 0.2),
            fakeView.zoom * fakeView.zoomStep,
            recursionDepth
        );

        // Zoom out.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomOut(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - 0.1 / fakeView.zoomStep),
            fakeView.contentY * (1.2 - 0.2 / fakeView.zoomStep),
            fakeView.zoom / fakeView.zoomStep,
            recursionDepth
        );
    }
}

function checkIdentityCenter(fakeView: FakeView): void {
    assertAlmostEqual(fakeView.contentX, (fakeView.width - fakeView.contentWidth) / 2);
    assertAlmostEqual(fakeView.contentY, (fakeView.height - fakeView.contentHeight) / 2);
    assertEqual(fakeView.zoom, 1);
}

// Auto Fit 100% State.

function checkAutoFit100PercentState(creator: () => FakeView, recursionDepth: number): void {
    if (recursionDepth > 0) {
        --recursionDepth;

        const fakeView = creator();

        assertEqual(fakeView.zoomMode, model.ZoomMode.AutoFit);
        checkIdentityCenter(fakeView);

        // Drag.
        checkFixed100PercentState(
            makeCreator(creator, (v) => v.beginDrag(10, 20)(30, 50)),
            fakeView.contentX + 20,
            fakeView.contentY + 30,
            recursionDepth
        );

        // Resize.
        {
            const newWidth = fakeView.width / 1.1;
            const newHeight = fakeView.height / 1.2;

            const checker = fakeView.hasEnoughSpaceWithSize(newWidth, newHeight) ?
                checkAutoFit100PercentState :
                checkAutoFitFitState;

            checker(makeCreator(creator, (v) => v.resize(newWidth, newHeight)), recursionDepth);
        }

        // Resize content.
        {
            const newContentWidth = fakeView.contentWidth * 1.1;
            const newContentHeight = fakeView.contentHeight * 1.2;

            const checker = fakeView.hasEnoughSpaceWithContentSize(newContentWidth, newContentHeight) ?
                checkAutoFit100PercentState :
                checkAutoFitFitState;

            checker(makeCreator(creator, (v) => v.resizeContent(newContentWidth, newContentHeight)), recursionDepth);
        }

        // Set Zoom Mode.
        {
            // Fixed.
            checkFixed100PercentState(
                makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fixed)),
                fakeView.contentX,
                fakeView.contentY,
                recursionDepth
            );

            // Fit.
            checkFitState(makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fit)), recursionDepth);

            // Auto Fit.
            {
                checkAutoFit100PercentState(
                    makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.AutoFit)),
                    recursionDepth
                );
            }
        }

        // Toggle overview.
        checkFitState(
            makeCreator(creator, (v) => v.toggleOverview(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            recursionDepth
        );

        // Zoom in.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomIn(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - fakeView.zoomStep * 0.1),
            fakeView.contentY * (1.2 - fakeView.zoomStep * 0.2),
            fakeView.zoom * fakeView.zoomStep,
            recursionDepth
        );

        // Zoom out.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomOut(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - 0.1 / fakeView.zoomStep),
            fakeView.contentY * (1.2 - 0.2 / fakeView.zoomStep),
            fakeView.zoom / fakeView.zoomStep,
            recursionDepth
        );
    }
}

function checkAutoFit100PercentStateWithSavedState(
    creator: () => FakeView,
    savedState: SavedState,
    recursionDepth: number
): void {
    if (recursionDepth > 0) {
        --recursionDepth;

        const fakeView = creator();

        assertEqual(fakeView.zoomMode, model.ZoomMode.AutoFit);
        checkIdentityCenter(fakeView);

        // Drag.
        checkFixed100PercentState(
            makeCreator(creator, (v) => v.beginDrag(10, 20)(30, 50)),
            fakeView.contentX + 20,
            fakeView.contentY + 30,
            recursionDepth
        );

        // Resize.
        {
            const newWidth = fakeView.width / 1.1;
            const newHeight = fakeView.height / 1.2;

            const checker = fakeView.hasEnoughSpaceWithSize(newWidth, newHeight) ?
                checkAutoFit100PercentStateWithSavedState :
                checkAutoFitFitStateWithSavedState;

            checker(makeCreator(creator, (v) => v.resize(newWidth, newHeight)), savedState, recursionDepth);
        }

        // Resize content.
        {
            const newContentWidth = fakeView.contentWidth * 1.1;
            const newContentHeight = fakeView.contentHeight * 1.2;

            const checker = fakeView.hasEnoughSpaceWithContentSize(newContentWidth, newContentHeight) ?
                checkAutoFit100PercentStateWithSavedState :
                checkAutoFitFitStateWithSavedState;

            checker(
                makeCreator(creator, (v) => v.resizeContent(newContentWidth, newContentHeight)),
                savedState,
                recursionDepth
            );
        }

        // Set Zoom Mode.
        {
            // Fixed.
            savedState(makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fixed)), recursionDepth);

            // Fit.
            checkFitStateWithSavedState(
                makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fit)),
                savedState,
                recursionDepth
            );

            // Auto Fit.
            {
                checkAutoFit100PercentStateWithSavedState(
                    makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.AutoFit)),
                    savedState,
                    recursionDepth
                );
            }
        }

        // Toggle overview.
        checkFitStateWithSavedState(
            makeCreator(creator, (v) => v.toggleOverview(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            savedState,
            recursionDepth
        );

        // Zoom in.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomIn(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - fakeView.zoomStep * 0.1),
            fakeView.contentY * (1.2 - fakeView.zoomStep * 0.2),
            fakeView.zoom * fakeView.zoomStep,
            recursionDepth
        );

        // Zoom out.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomOut(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - 0.1 / fakeView.zoomStep),
            fakeView.contentY * (1.2 - 0.2 / fakeView.zoomStep),
            fakeView.zoom / fakeView.zoomStep,
            recursionDepth
        );
    }
}

function checkAutoFit100PercentStateWithSavedStateAndZoom(
    creator: () => FakeView,
    savedState: SavedState,
    savedZoom: number,
    recursionDepth: number
): void {
    if (recursionDepth > 0) {
        --recursionDepth;

        const fakeView = creator();

        assertEqual(fakeView.zoomMode, model.ZoomMode.AutoFit);
        checkIdentityCenter(fakeView);

        // Drag.
        checkFixed100PercentStateWithSavedZoom(
            makeCreator(creator, (v) => v.beginDrag(10, 20)(30, 50)),
            fakeView.contentX + 20,
            fakeView.contentY + 30,
            savedZoom,
            recursionDepth
        );

        // Resize.
        {
            const newWidth = fakeView.width / 1.1;
            const newHeight = fakeView.height / 1.2;

            const checker = fakeView.hasEnoughSpaceWithSize(newWidth, newHeight) ?
                checkAutoFit100PercentStateWithSavedStateAndZoom :
                checkAutoFitFitStateWithSavedStateAndZoom;

            checker(makeCreator(creator, (v) => v.resize(newWidth, newHeight)), savedState, savedZoom, recursionDepth);
        }

        // Resize content.
        {
            const newContentWidth = fakeView.contentWidth * 1.1;
            const newContentHeight = fakeView.contentHeight * 1.2;

            const checker = fakeView.hasEnoughSpaceWithContentSize(newContentWidth, newContentHeight) ?
                checkAutoFit100PercentStateWithSavedStateAndZoom :
                checkAutoFitFitStateWithSavedStateAndZoom;

            checker(
                makeCreator(creator, (v) => v.resizeContent(newContentWidth, newContentHeight)),
                savedState,
                savedZoom,
                recursionDepth
            );
        }

        // Set Zoom Mode.
        {
            // Fixed.
            savedState(makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fixed)), recursionDepth);

            // Fit.
            checkFitStateWithSavedStateAndZoom(
                makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fit)),
                savedState,
                savedZoom,
                recursionDepth
            );

            // Auto Fit.
            {
                checkAutoFit100PercentStateWithSavedStateAndZoom(
                    makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.AutoFit)),
                    savedState,
                    savedZoom,
                    recursionDepth
                );
            }
        }

        // Toggle overview.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.toggleOverview(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - savedZoom * 0.1),
            fakeView.contentY * (1.2 - savedZoom * 0.2),
            savedZoom,
            recursionDepth
        );

        // Zoom in.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomIn(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - fakeView.zoomStep * 0.1),
            fakeView.contentY * (1.2 - fakeView.zoomStep * 0.2),
            fakeView.zoom * fakeView.zoomStep,
            recursionDepth
        );

        // Zoom out.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomOut(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - 0.1 / fakeView.zoomStep),
            fakeView.contentY * (1.2 - 0.2 / fakeView.zoomStep),
            fakeView.zoom / fakeView.zoomStep,
            recursionDepth
        );
    }
}

function checkAutoFit100PercentStateWithSavedZoom(
    creator: () => FakeView,
    savedZoom: number,
    recursionDepth: number
): void {
    if (recursionDepth > 0) {
        --recursionDepth;

        const fakeView = creator();

        assertEqual(fakeView.zoomMode, model.ZoomMode.AutoFit);
        checkIdentityCenter(fakeView);

        // Drag.
        checkFixed100PercentStateWithSavedZoom(
            makeCreator(creator, (v) => v.beginDrag(10, 20)(30, 50)),
            fakeView.contentX + 20,
            fakeView.contentY + 30,
            savedZoom,
            recursionDepth
        );

        // Resize.
        {
            const newWidth = fakeView.width / 1.1;
            const newHeight = fakeView.height / 1.2;

            const checker = fakeView.hasEnoughSpaceWithSize(newWidth, newHeight) ?
                checkAutoFit100PercentStateWithSavedZoom :
                checkAutoFitFitStateWithSavedZoom;

            checker(makeCreator(creator, (v) => v.resize(newWidth, newHeight)), savedZoom, recursionDepth);
        }

        // Resize content.
        {
            const newContentWidth = fakeView.contentWidth * 1.1;
            const newContentHeight = fakeView.contentHeight * 1.2;

            const checker = fakeView.hasEnoughSpaceWithContentSize(newContentWidth, newContentHeight) ?
                checkAutoFit100PercentStateWithSavedZoom :
                checkAutoFitFitStateWithSavedZoom;

            checker(
                makeCreator(creator, (v) => v.resizeContent(newContentWidth, newContentHeight)),
                savedZoom,
                recursionDepth
            );
        }

        // Set Zoom Mode.
        {
            // Fixed.
            checkFixed100PercentStateWithSavedZoom(
                makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fixed)),
                fakeView.contentX,
                fakeView.contentY,
                savedZoom,
                recursionDepth
            );

            // Fit.
            checkFitStateWithSavedZoom(
                makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fit)),
                savedZoom,
                recursionDepth
            );

            // Auto Fit.
            {
                checkAutoFit100PercentStateWithSavedZoom(
                    makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.AutoFit)),
                    savedZoom,
                    recursionDepth
                );
            }
        }

        // Toggle overview.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.toggleOverview(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - savedZoom * 0.1),
            fakeView.contentY * (1.2 - savedZoom * 0.2),
            savedZoom,
            recursionDepth
        );

        // Zoom in.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomIn(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - fakeView.zoomStep * 0.1),
            fakeView.contentY * (1.2 - fakeView.zoomStep * 0.2),
            fakeView.zoom * fakeView.zoomStep,
            recursionDepth
        );

        // Zoom out.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomOut(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - 0.1 / fakeView.zoomStep),
            fakeView.contentY * (1.2 - 0.2 / fakeView.zoomStep),
            fakeView.zoom / fakeView.zoomStep,
            recursionDepth
        );
    }
}

// Auto Fit Fit State.

function checkAutoFitFitState(creator: () => FakeView, recursionDepth: number): void {
    if (recursionDepth > 0) {
        --recursionDepth;

        const fakeView = creator();

        assertEqual(fakeView.zoomMode, model.ZoomMode.AutoFit);
        checkFit(fakeView);

        // Drag.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.beginDrag(10, 20)(30, 50)),
            fakeView.contentX + 20,
            fakeView.contentY + 30,
            fakeView.zoom,
            recursionDepth
        );

        // Resize.
        {
            const newWidth = fakeView.width * 1.1;
            const newHeight = fakeView.height * 1.2;

            const checker = fakeView.hasEnoughSpaceWithSize(newWidth, newHeight) ?
                checkAutoFit100PercentState :
                checkAutoFitFitState;

            checker(makeCreator(creator, (v) => v.resize(newWidth, newHeight)), recursionDepth);
        }

        // Resize content.
        {
            const newContentWidth = fakeView.contentWidth / 1.1;
            const newContentHeight = fakeView.contentHeight / 1.2;

            const checker = fakeView.hasEnoughSpaceWithContentSize(newContentWidth, newContentHeight) ?
                checkAutoFit100PercentState :
                checkAutoFitFitState;

            checker(
                makeCreator(creator, (v) => v.resizeContent(newContentWidth, newContentHeight)),
                recursionDepth
            );
        }

        // Set Zoom Mode.
        {
            // Fixed.
            checkFixedNormalState(
                makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fixed)),
                fakeView.contentX,
                fakeView.contentY,
                fakeView.zoom,
                recursionDepth
            );

            // Fit.
            checkFitState(makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fit)), recursionDepth);

            // Auto Fit.
            {
                checkAutoFitFitState(
                    makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.AutoFit)),
                    recursionDepth
                );
            }
        }

        // Toggle overview.
        checkFixed100PercentState(
            makeCreator(creator, (v) => v.toggleOverview(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - 0.1 / fakeView.zoom),
            fakeView.contentY * (1.2 - 0.2 / fakeView.zoom),
            recursionDepth
        );

        // Zoom in.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomIn(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - fakeView.zoomStep * 0.1),
            fakeView.contentY * (1.2 - fakeView.zoomStep * 0.2),
            fakeView.zoom * fakeView.zoomStep,
            recursionDepth
        );

        // Zoom out.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomOut(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - 0.1 / fakeView.zoomStep),
            fakeView.contentY * (1.2 - 0.2 / fakeView.zoomStep),
            fakeView.zoom / fakeView.zoomStep,
            recursionDepth
        );
    }
}

function checkAutoFitFitStateWithSavedState(
    creator: () => FakeView,
    savedState: SavedState,
    recursionDepth: number
): void {
    if (recursionDepth > 0) {
        --recursionDepth;

        const fakeView = creator();

        assertEqual(fakeView.zoomMode, model.ZoomMode.AutoFit);
        checkFit(fakeView);

        // Drag.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.beginDrag(10, 20)(30, 50)),
            fakeView.contentX + 20,
            fakeView.contentY + 30,
            fakeView.zoom,
            recursionDepth
        );

        // Resize.
        {
            const newWidth = fakeView.width * 1.1;
            const newHeight = fakeView.height * 1.2;

            const checker = fakeView.hasEnoughSpaceWithSize(newWidth, newHeight) ?
                checkAutoFit100PercentStateWithSavedState :
                checkAutoFitFitStateWithSavedState;

            checker(makeCreator(creator, (v) => v.resize(newWidth, newHeight)), savedState, recursionDepth);
        }

        // Resize content.
        {
            const newContentWidth = fakeView.contentWidth / 1.1;
            const newContentHeight = fakeView.contentHeight / 1.2;

            const checker = fakeView.hasEnoughSpaceWithContentSize(newContentWidth, newContentHeight) ?
                checkAutoFit100PercentStateWithSavedState :
                checkAutoFitFitStateWithSavedState;

            checker(
                makeCreator(creator, (v) => v.resizeContent(newContentWidth, newContentHeight)),
                savedState,
                recursionDepth
            );
        }

        // Set Zoom Mode.
        {
            // Fixed.
            savedState(makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fixed)), recursionDepth);

            // Fit.
            checkFitStateWithSavedState(
                makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fit)),
                savedState,
                recursionDepth
            );

            // Auto Fit.
            {
                checkAutoFitFitStateWithSavedState(
                    makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.AutoFit)),
                    savedState,
                    recursionDepth
                );
            }
        }

        // Toggle overview.
        checkFixed100PercentState(
            makeCreator(creator, (v) => v.toggleOverview(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - 0.1 / fakeView.zoom),
            fakeView.contentY * (1.2 - 0.2 / fakeView.zoom),
            recursionDepth
        );

        // Zoom in.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomIn(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - fakeView.zoomStep * 0.1),
            fakeView.contentY * (1.2 - fakeView.zoomStep * 0.2),
            fakeView.zoom * fakeView.zoomStep,
            recursionDepth
        );

        // Zoom out.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomOut(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - 0.1 / fakeView.zoomStep),
            fakeView.contentY * (1.2 - 0.2 / fakeView.zoomStep),
            fakeView.zoom / fakeView.zoomStep,
            recursionDepth
        );
    }
}

function checkAutoFitFitStateWithSavedStateAndZoom(
    creator: () => FakeView,
    savedState: SavedState,
    savedZoom: number,
    recursionDepth: number
): void {
    if (recursionDepth > 0) {
        --recursionDepth;

        const fakeView = creator();

        assertEqual(fakeView.zoomMode, model.ZoomMode.AutoFit);
        checkFit(fakeView);

        // Drag.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.beginDrag(10, 20)(30, 50)),
            fakeView.contentX + 20,
            fakeView.contentY + 30,
            fakeView.zoom,
            recursionDepth
        );

        // Resize.
        {
            const newWidth = fakeView.width * 1.1;
            const newHeight = fakeView.height * 1.2;

            const checker = fakeView.hasEnoughSpaceWithSize(newWidth, newHeight) ?
                checkAutoFit100PercentStateWithSavedStateAndZoom :
                checkAutoFitFitStateWithSavedStateAndZoom;

            checker(makeCreator(creator, (v) => v.resize(newWidth, newHeight)), savedState, savedZoom, recursionDepth);
        }

        // Resize content.
        {
            const newContentWidth = fakeView.contentWidth / 1.1;
            const newContentHeight = fakeView.contentHeight / 1.2;

            const checker = fakeView.hasEnoughSpaceWithContentSize(newContentWidth, newContentHeight) ?
                checkAutoFit100PercentStateWithSavedStateAndZoom :
                checkAutoFitFitStateWithSavedStateAndZoom;

            checker(
                makeCreator(creator, (v) => v.resizeContent(newContentWidth, newContentHeight)),
                savedState,
                savedZoom,
                recursionDepth
            );
        }

        // Set Zoom Mode.
        {
            // Fixed.
            savedState(makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fixed)), recursionDepth);

            // Fit.
            checkFitStateWithSavedStateAndZoom(
                makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fit)),
                savedState,
                savedZoom,
                recursionDepth
            );

            // Auto Fit.
            {
                checkAutoFitFitStateWithSavedStateAndZoom(
                    makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.AutoFit)),
                    savedState,
                    savedZoom,
                    recursionDepth
                );
            }
        }

        // Toggle overview.
        checkFixed100PercentStateWithSavedZoom(
            makeCreator(creator, (v) => v.toggleOverview(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - 0.1 / fakeView.zoom),
            fakeView.contentY * (1.2 - 0.2 / fakeView.zoom),
            savedZoom,
            recursionDepth
        );

        // Zoom in.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomIn(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - fakeView.zoomStep * 0.1),
            fakeView.contentY * (1.2 - fakeView.zoomStep * 0.2),
            fakeView.zoom * fakeView.zoomStep,
            recursionDepth
        );

        // Zoom out.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomOut(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - 0.1 / fakeView.zoomStep),
            fakeView.contentY * (1.2 - 0.2 / fakeView.zoomStep),
            fakeView.zoom / fakeView.zoomStep,
            recursionDepth
        );
    }
}

function checkAutoFitFitStateWithSavedZoom(
    creator: () => FakeView,
    savedZoom: number,
    recursionDepth: number
): void {
    if (recursionDepth > 0) {
        --recursionDepth;

        const fakeView = creator();

        assertEqual(fakeView.zoomMode, model.ZoomMode.AutoFit);
        checkFit(fakeView);

        // Drag.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.beginDrag(10, 20)(30, 50)),
            fakeView.contentX + 20,
            fakeView.contentY + 30,
            fakeView.zoom,
            recursionDepth
        );

        // Resize.
        {
            const newWidth = fakeView.width * 1.1;
            const newHeight = fakeView.height * 1.2;

            const checker = fakeView.hasEnoughSpaceWithSize(newWidth, newHeight) ?
                checkAutoFit100PercentStateWithSavedZoom :
                checkAutoFitFitStateWithSavedZoom;

            checker(makeCreator(creator, (v) => v.resize(newWidth, newHeight)), savedZoom, recursionDepth);
        }

        // Resize content.
        {
            const newContentWidth = fakeView.contentWidth / 1.1;
            const newContentHeight = fakeView.contentHeight / 1.2;

            const checker = fakeView.hasEnoughSpaceWithContentSize(newContentWidth, newContentHeight) ?
                checkAutoFit100PercentStateWithSavedZoom :
                checkAutoFitFitStateWithSavedZoom;

            checker(
                makeCreator(creator, (v) => v.resizeContent(newContentWidth, newContentHeight)),
                savedZoom,
                recursionDepth
            );
        }

        // Set Zoom Mode.
        {
            // Fixed.
            checkInitialFixedState(
                makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fixed)),
                fakeView,
                recursionDepth
            );

            // Fit.
            checkFitStateWithSavedZoom(
                makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.Fit)),
                savedZoom,
                recursionDepth
            );

            // Auto Fit.
            {
                checkAutoFitFitStateWithSavedZoom(
                    makeCreator(creator, (v) => v.setZoomMode(model.ZoomMode.AutoFit)),
                    savedZoom,
                    recursionDepth
                );
            }
        }

        // Toggle overview.
        checkFixed100PercentStateWithSavedZoom(
            makeCreator(creator, (v) => v.toggleOverview(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - 0.1 / fakeView.zoom),
            fakeView.contentY * (1.2 - 0.2 / fakeView.zoom),
            savedZoom,
            recursionDepth
        );

        // Zoom in.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomIn(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - fakeView.zoomStep * 0.1),
            fakeView.contentY * (1.2 - fakeView.zoomStep * 0.2),
            fakeView.zoom * fakeView.zoomStep,
            recursionDepth
        );

        // Zoom out.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomOut(fakeView.contentX * 1.1, fakeView.contentY * 1.2)),
            fakeView.contentX * (1.1 - 0.1 / fakeView.zoomStep),
            fakeView.contentY * (1.2 - 0.2 / fakeView.zoomStep),
            fakeView.zoom / fakeView.zoomStep,
            recursionDepth
        );
    }
}

suite("Model", function (): void {
    test("Fixed Controller - 100%", function (): void {
        checkFixed100PercentState(
            () => new FakeView(600, 400, 300, 200, 10, 1.1, model.ZoomMode.Fixed),
            150,
            100,
            testRecursionDepth
        );
    });

    test("Create Fixed Controller - Corner", function (): void {
        checkFixedNormalState(
            () => new FakeView(600, 400, 580, 380, 10, 1.1, model.ZoomMode.Fixed),
            10,
            10,
            1,
            testRecursionDepth
        );
    });

    test("Create Fixed Controller - Fit Horizontal", function (): void {
        checkFixedNormalState(
            () => new FakeView(600, 400, 581, 380, 10, 1.1, model.ZoomMode.Fixed),
            10,
            6000 / 581,
            580 / 581,
            testRecursionDepth
        );
    });

    test("Create Fixed Controller - Fit Vertical", function (): void {
        checkFixedNormalState(
            () => new FakeView(600, 400, 580, 381, 10, 1.1, model.ZoomMode.Fixed),
            4100 / 381,
            10,
            380 / 381,
            testRecursionDepth
        );
    });

    test("Create Fit Controller - Upscaling - Fit Horizontal", function (): void {
        checkFitState(() => new FakeView(600, 400, 100, 10, 10, 1.1, model.ZoomMode.Fit), testRecursionDepth);
    });

    test("Create Fit Controller - Upscaling - Fit Vertical", function (): void {
        checkFitState(() => new FakeView(600, 400, 10, 100, 10, 1.1, model.ZoomMode.Fit), testRecursionDepth);
    });

    test("Create Fit Controller - Downscaling - Fit Horizontal", function (): void {
        checkFitState(() => new FakeView(600, 400, 1000, 100, 10, 1.1, model.ZoomMode.Fit), testRecursionDepth);
    });

    test("Create Fit Controller - Downscaling - Fit Vertical", function (): void {
        checkFitState(() => new FakeView(600, 400, 100, 1000, 10, 1.1, model.ZoomMode.Fit), testRecursionDepth);
    });

    test("Create AutoFit Controller - 100%", function (): void {
        checkAutoFit100PercentState(
            () => new FakeView(600, 400, 300, 200, 10, 1.1, model.ZoomMode.AutoFit),
            testRecursionDepth
        );
    });

    test("Create AutoFit Controller - Corner", function (): void {
        checkAutoFitFitState(
            () => new FakeView(600, 400, 580, 380, 10, 1.1, model.ZoomMode.AutoFit),
            testRecursionDepth
        );
    });

    test("Create AutoFit Controller - Fit Horizontal", function (): void {
        checkAutoFitFitState(
            () => new FakeView(600, 400, 581, 380, 10, 1.1, model.ZoomMode.AutoFit),
            testRecursionDepth
        );
    });

    test("Create AutoFit Controller - Fit Vertical", function (): void {
        checkAutoFitFitState(
            () => new FakeView(600, 400, 580, 381, 10, 1.1, model.ZoomMode.AutoFit),
            testRecursionDepth
        );
    });
});
