import * as assert from "assert";
import * as model from "../model";

const floatCheckEpsilon = 1e-12;
const testRecursionDepth = 5;

class FakeView {
    private widthValue: number;
    private heightValue: number;
    private contentWidthValue: number;
    private contentHeightValue: number;
    private contentMarginValue: number;
    private zoomModeValue: model.ZoomMode = -1;
    private xValue: number = -1;
    private yValue: number = -1;
    private zoomValue: number = -1;
    private controller: model.Controller;

    constructor(
        zoomMode: model.ZoomMode,
        width: number,
        height: number,
        contentWidth: number,
        contentHeight: number,
        contentMargin: number,
        public readonly zoomStep: number) {

        this.widthValue = width;
        this.heightValue = height;
        this.contentWidthValue = contentWidth;
        this.contentHeightValue = contentHeight;
        this.contentMarginValue = contentMargin;

        const self = this;

        const listener = new class implements model.IViewEventListener {
            public onZoomModeChanged(zoomMode: model.ZoomMode): void {
                self.zoomModeValue = zoomMode;
            }

            public onLayoutChanged(x: number, y: number, zoom: number): void {
                self.xValue = x;
                self.yValue = y;
                self.zoomValue = zoom;
            }
        };

        switch (zoomMode) {
            case model.ZoomMode.Fixed:
                this.controller = model.Controller.createFixed(
                    width,
                    height,
                    contentWidth,
                    contentHeight,
                    contentMargin,
                    listener,
                    zoomStep);
                break;
            case model.ZoomMode.Fit:
                this.controller = model.Controller.createFit(
                    width,
                    height,
                    contentWidth,
                    contentHeight,
                    contentMargin,
                    listener,
                    zoomStep);
                break;
            default:
                this.controller = model.Controller.createAutoFit(
                    width,
                    height,
                    contentWidth,
                    contentHeight,
                    contentMargin,
                    listener,
                    zoomStep);
                break;
        }
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

    public get zoomMode(): model.ZoomMode {
        return this.zoomModeValue;
    }

    public get x(): number {
        return this.xValue;
    }

    public get y(): number {
        return this.yValue;
    }

    public get zoom(): number {
        return this.zoomValue;
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

    public toggleOverview(x: number, y: number): void {
        this.controller.toggleOverview(x, y);
    }

    public zoomIn(x: number, y: number): void {
        this.controller.zoomIn(x, y);
    }

    public zoomOut(x: number, y: number): void {
        this.controller.zoomOut(x, y);
    }

    public beginDrag(x: number, y: number): (x: number, y: number) => void {
        return this.controller.beginDrag(x, y);
    }
}

function assertAlmostEqual(actual: number, expected: number): void {
    assert(Math.abs(actual - expected) < floatCheckEpsilon, `Actual: ${actual}, Expected: ${expected}.`)
}

function makeCreator(creator: () => FakeView, action: (fakeView: FakeView) => void) {
    return () => {
        const fakeView = creator();

        action(fakeView);

        return fakeView;
    }
}

function checkFixedNormalState(
    creator: () => FakeView,
    expectedX: number,
    expectedY: number,
    expectedZoom: number,
    recursionDepth: number): void {
    if (recursionDepth > 0) {
        const fakeView = creator();

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fixed);
        assertAlmostEqual(fakeView.x, expectedX);
        assertAlmostEqual(fakeView.y, expectedY);
        assertAlmostEqual(fakeView.zoom, expectedZoom);

        // Drag.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.beginDrag(10, 20)(30, 50)),
            fakeView.x + 20,
            fakeView.y + 30,
            fakeView.zoom,
            recursionDepth - 1)

        // Resize.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.resize(fakeView.width * 1.1, fakeView.height * 1.2)),
            fakeView.x + fakeView.width * 0.05,
            fakeView.y + fakeView.height * 0.1,
            fakeView.zoom,
            recursionDepth - 1);

        // Resize content.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.resizeContent(fakeView.contentWidth * 1.1, fakeView.contentHeight * 1.2)),
            fakeView.x * 1.1 - fakeView.width * 0.05,
            fakeView.y * 1.2 - fakeView.height * 0.1,
            fakeView.zoom,
            recursionDepth - 1);

        // Toggle overview.
        checkFixed100PercentState(
            makeCreator(creator, (v) => v.toggleOverview(fakeView.x * 1.1, fakeView.y * 1.2)),
            fakeView.x * (1.1 - 0.1 / fakeView.zoom),
            fakeView.y * (1.2 - 0.2 / fakeView.zoom),
            fakeView.zoom,
            recursionDepth - 1)

        // Zoom in.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomIn(fakeView.x * 1.1, fakeView.y * 1.2)),
            fakeView.x * (1.1 - fakeView.zoomStep * 0.1),
            fakeView.y * (1.2 - fakeView.zoomStep * 0.2),
            fakeView.zoom * fakeView.zoomStep,
            recursionDepth - 1);

        // Zoom out.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomOut(fakeView.x * 1.1, fakeView.y * 1.2)),
            fakeView.x * (1.1 - 0.1 / fakeView.zoomStep),
            fakeView.y * (1.2 - 0.2 / fakeView.zoomStep),
            fakeView.zoom / fakeView.zoomStep,
            recursionDepth - 1);
    }
}

function checkFixed100PercentState(
    creator: () => FakeView,
    expectedX: number,
    expectedY: number,
    savedZoom: number,
    recursionDepth: number): void {
    if (recursionDepth > 0) {
        const fakeView = creator();

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fixed);
        assertAlmostEqual(fakeView.x, expectedX);
        assertAlmostEqual(fakeView.y, expectedY);
        assertAlmostEqual(fakeView.zoom, 1);

        // Drag.
        checkFixed100PercentState(
            makeCreator(creator, (v) => v.beginDrag(10, 20)(30, 50)),
            fakeView.x + 20,
            fakeView.y + 30,
            savedZoom,
            recursionDepth - 1)

        // Resize.
        checkFixed100PercentState(
            makeCreator(creator, (v) => v.resize(fakeView.width * 1.1, fakeView.height * 1.2)),
            fakeView.x + fakeView.width * 0.05,
            fakeView.y + fakeView.height * 0.1,
            savedZoom,
            recursionDepth - 1);

        // Resize content.
        checkFixed100PercentState(
            makeCreator(creator, (v) => v.resizeContent(fakeView.contentWidth * 1.1, fakeView.contentHeight * 1.2)),
            fakeView.x * 1.1 - fakeView.width * 0.05,
            fakeView.y * 1.2 - fakeView.height * 0.1,
            savedZoom,
            recursionDepth - 1);

        // Toggle overview.
        checkFitState(
            makeCreator(creator, (v) => v.toggleOverview(fakeView.x * 1.1, fakeView.y * 1.2)),
            savedZoom,
            recursionDepth - 1)

        // Zoom in.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomIn(fakeView.x * 1.1, fakeView.y * 1.2)),
            fakeView.x * (1.1 - fakeView.zoomStep * 0.1),
            fakeView.y * (1.2 - fakeView.zoomStep * 0.2),
            fakeView.zoomStep,
            recursionDepth - 1);

        // Zoom out.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomOut(fakeView.x * 1.1, fakeView.y * 1.2)),
            fakeView.x * (1.1 - 0.1 / fakeView.zoomStep),
            fakeView.y * (1.2 - 0.2 / fakeView.zoomStep),
            1 / fakeView.zoomStep,
            recursionDepth - 1);
    }
}

function checkFixedPure100PercentState(
    creator: () => FakeView,
    expectedX: number,
    expectedY: number,
    recursionDepth: number): void {
    if (recursionDepth > 0) {
        const fakeView = creator();

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fixed);
        assertAlmostEqual(fakeView.x, expectedX);
        assertAlmostEqual(fakeView.y, expectedY);
        assertAlmostEqual(fakeView.zoom, 1);

        // Drag.
        checkFixedPure100PercentState(
            makeCreator(creator, (v) => v.beginDrag(10, 20)(30, 50)),
            fakeView.x + 20,
            fakeView.y + 30,
            recursionDepth - 1)

        // Resize.
        checkFixedPure100PercentState(
            makeCreator(creator, (v) => v.resize(fakeView.width * 1.1, fakeView.height * 1.2)),
            fakeView.x + fakeView.width * 0.05,
            fakeView.y + fakeView.height * 0.1,
            recursionDepth - 1);

        // Resize content.
        checkFixedPure100PercentState(
            makeCreator(creator, (v) => v.resizeContent(fakeView.contentWidth * 1.1, fakeView.contentHeight * 1.2)),
            fakeView.x * 1.1 - fakeView.width * 0.05,
            fakeView.y * 1.2 - fakeView.height * 0.1,
            recursionDepth - 1);

        // Toggle overview.
        checkPureFitState(
            makeCreator(creator, (v) => v.toggleOverview(fakeView.x * 1.1, fakeView.y * 1.2)),
            recursionDepth - 1)

        // Zoom in.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomIn(fakeView.x * 1.1, fakeView.y * 1.2)),
            fakeView.x * (1.1 - fakeView.zoomStep * 0.1),
            fakeView.y * (1.2 - fakeView.zoomStep * 0.2),
            fakeView.zoomStep,
            recursionDepth - 1);

        // Zoom out.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomOut(fakeView.x * 1.1, fakeView.y * 1.2)),
            fakeView.x * (1.1 - 0.1 / fakeView.zoomStep),
            fakeView.y * (1.2 - 0.2 / fakeView.zoomStep),
            1 / fakeView.zoomStep,
            recursionDepth - 1);
    }
}

function checkFit(fakeView: FakeView): void {
    const expectedZoom = Math.min(
        (fakeView.width - fakeView.contentMargin * 2) / fakeView.contentWidth,
        (fakeView.height - fakeView.contentMargin * 2) / fakeView.contentHeight);

    const expectedX = (fakeView.width - fakeView.contentWidth * expectedZoom) / 2;
    const expectedY = (fakeView.height - fakeView.contentHeight * expectedZoom) / 2;

    assertAlmostEqual(fakeView.x, expectedX);
    assertAlmostEqual(fakeView.y, expectedY);
    assertAlmostEqual(fakeView.zoom, expectedZoom);
}

function checkFitState(creator: () => FakeView, savedZoom: number, recursionDepth: number): void {
    if (recursionDepth > 0) {
        const fakeView = creator();

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fit);

        checkFit(fakeView);

        // Drag.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.beginDrag(10, 20)(30, 50)),
            fakeView.x + 20,
            fakeView.y + 30,
            fakeView.zoom,
            recursionDepth - 1)

        // Resize.
        checkFitState(
            makeCreator(creator, (v) => v.resize(fakeView.width * 1.1, fakeView.height * 1.2)),
            savedZoom,
            recursionDepth - 1);

        // Resize content.
        checkFitState(
            makeCreator(creator, (v) => v.resizeContent(fakeView.contentWidth * 1.1, fakeView.contentHeight * 1.2)),
            savedZoom,
            recursionDepth - 1);

        // Toggle overview.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.toggleOverview(fakeView.x * 1.1, fakeView.y * 1.2)),
            fakeView.x * (1.1 - savedZoom / fakeView.zoom * 0.1),
            fakeView.y * (1.2 - savedZoom / fakeView.zoom * 0.2),
            savedZoom,
            recursionDepth - 1)

        // Zoom in.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomIn(fakeView.x * 1.1, fakeView.y * 1.2)),
            fakeView.x * (1.1 - fakeView.zoomStep * 0.1),
            fakeView.y * (1.2 - fakeView.zoomStep * 0.2),
            fakeView.zoom * fakeView.zoomStep,
            recursionDepth - 1);

        // Zoom out.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomOut(fakeView.x * 1.1, fakeView.y * 1.2)),
            fakeView.x * (1.1 - 0.1 / fakeView.zoomStep),
            fakeView.y * (1.2 - 0.2 / fakeView.zoomStep),
            fakeView.zoom / fakeView.zoomStep,
            recursionDepth - 1);
    }
}

function checkPureFitState(creator: () => FakeView, recursionDepth: number): void {
    if (recursionDepth > 0) {
        const fakeView = creator();

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fit);

        checkFit(fakeView);

        // Resize.
        checkPureFitState(makeCreator(creator, (v) => v.resize(640, 480)), recursionDepth - 1);

        // Zoom in.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomIn(2, 3)),
            fakeView.x + (fakeView.x - 2) * (fakeView.zoomStep - 1),
            fakeView.y + (fakeView.y - 3) * (fakeView.zoomStep - 1),
            fakeView.zoom * fakeView.zoomStep,
            recursionDepth - 1);

        // Zoom out.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomOut(5, 7)),
            fakeView.x + (fakeView.x - 5) * ((1 / fakeView.zoomStep) - 1),
            fakeView.y + (fakeView.y - 7) * ((1 / fakeView.zoomStep) - 1),
            fakeView.zoom / fakeView.zoomStep,
            recursionDepth - 1);
    }
}

function checkAutoFit100PercentState(
    creator: () => FakeView,
    expectedX: number,
    expectedY: number,
    recursionDepth: number): void {
    if (recursionDepth > 0) {
        const fakeView = creator();

        assert.equal(fakeView.zoomMode, model.ZoomMode.AutoFit);
        assertAlmostEqual(fakeView.x, expectedX);
        assertAlmostEqual(fakeView.y, expectedY);
        assertAlmostEqual(fakeView.zoom, 1);

        // Zoom in.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomIn(2, 3)),
            expectedX + (expectedX - 2) * (fakeView.zoomStep - 1),
            expectedY + (expectedY - 3) * (fakeView.zoomStep - 1),
            fakeView.zoomStep,
            recursionDepth - 1);
    }
}

function checkAutoFitPure100PercentState(
    creator: () => FakeView,
    expectedX: number,
    expectedY: number,
    recursionDepth: number): void {
    if (recursionDepth > 0) {
        const fakeView = creator();

        assert.equal(fakeView.zoomMode, model.ZoomMode.AutoFit);
        assertAlmostEqual(fakeView.x, expectedX);
        assertAlmostEqual(fakeView.y, expectedY);
        assertAlmostEqual(fakeView.zoom, 1);

        // Zoom in.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomIn(2, 3)),
            expectedX + (expectedX - 2) * (fakeView.zoomStep - 1),
            expectedY + (expectedY - 3) * (fakeView.zoomStep - 1),
            fakeView.zoomStep,
            recursionDepth - 1);
    }
}

function checkAutoFitFitState(
    creator: () => FakeView,
    recursionDepth: number): void {
    if (recursionDepth > 0) {
        const fakeView = creator();

        assert.equal(fakeView.zoomMode, model.ZoomMode.AutoFit);

        checkFit(fakeView);

        // Zoom in.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomIn(2, 3)),
            fakeView.x + (fakeView.x - 2) * (fakeView.zoomStep - 1),
            fakeView.y + (fakeView.y - 3) * (fakeView.zoomStep - 1),
            fakeView.zoom * fakeView.zoomStep,
            recursionDepth - 1);
    }
}

function checkAutoFitPureFitState(
    creator: () => FakeView,
    recursionDepth: number): void {
    if (recursionDepth > 0) {
        const fakeView = creator();

        assert.equal(fakeView.zoomMode, model.ZoomMode.AutoFit);

        checkFit(fakeView);

        // Zoom in.
        checkFixedNormalState(
            makeCreator(creator, (v) => v.zoomIn(2, 3)),
            fakeView.x + (fakeView.x - 2) * (fakeView.zoomStep - 1),
            fakeView.y + (fakeView.y - 3) * (fakeView.zoomStep - 1),
            fakeView.zoom * fakeView.zoomStep,
            recursionDepth - 1);
    }
}

suite("Model", function () {
    test("Fixed Controller - 100%", function () {
        checkFixedPure100PercentState(
            () => new FakeView(model.ZoomMode.Fixed, 600, 400, 300, 200, 10, 1.1),
            150,
            100,
            testRecursionDepth
        )
    });

    test("Create Fixed Controller - Corner", function () {
        checkFixedNormalState(
            () => new FakeView(model.ZoomMode.Fixed, 600, 400, 580, 380, 10, 1.1),
            10,
            10,
            1,
            testRecursionDepth
        )
    });

    test("Create Fixed Controller - Fit Horizontal", function () {
        checkFixedNormalState(
            () => new FakeView(model.ZoomMode.Fixed, 600, 400, 581, 380, 10, 1.1),
            10,
            6000 / 581,
            580 / 581,
            testRecursionDepth
        )
    });

    test("Create Fixed Controller - Fit Vertical", function () {
        checkFixedNormalState(
            () => new FakeView(model.ZoomMode.Fixed, 600, 400, 580, 381, 10, 1.1),
            4100 / 381,
            10,
            380 / 381,
            testRecursionDepth
        )
    });

    test("Create Fit Controller - Upscaling - Fit Horizontal", function () {
        checkPureFitState(() => new FakeView(model.ZoomMode.Fit, 600, 400, 100, 10, 10, 1.1), testRecursionDepth);
    });

    test("Create Fit Controller - Upscaling - Fit Vertical", function () {
        checkPureFitState(() => new FakeView(model.ZoomMode.Fit, 600, 400, 10, 100, 10, 1.1), testRecursionDepth);
    });

    test("Create Fit Controller - Downscaling - Fit Horizontal", function () {
        checkPureFitState(() => new FakeView(model.ZoomMode.Fit, 600, 400, 1000, 100, 10, 1.1), testRecursionDepth);
    });

    test("Create Fit Controller - Downscaling - Fit Vertical", function () {
        checkPureFitState(() => new FakeView(model.ZoomMode.Fit, 600, 400, 100, 1000, 10, 1.1), testRecursionDepth);
    });

    test("Create AutoFit Controller - 100%", function () {
        checkAutoFitPure100PercentState(
            () => new FakeView(model.ZoomMode.AutoFit, 600, 400, 300, 200, 10, 1.1),
            150,
            100,
            testRecursionDepth);
    });

    test("Create AutoFit Controller - Corner", function () {
        checkAutoFitPureFitState(
            () => new FakeView(model.ZoomMode.AutoFit, 600, 400, 580, 380, 10, 1.1),
            testRecursionDepth);
    });

    test("Create AutoFit Controller - Fit Horizontal", function () {
        checkAutoFitPureFitState(
            () => new FakeView(model.ZoomMode.AutoFit, 600, 400, 581, 380, 10, 1.1),
            testRecursionDepth);
    });

    test("Create AutoFit Controller - Fit Vertical", function () {
        checkAutoFitPureFitState(
            () => new FakeView(model.ZoomMode.AutoFit, 600, 400, 580, 381, 10, 1.1),
            testRecursionDepth);
    });
});
