import * as assert from "assert";
import * as model from "../model";

class FakeView implements model.IViewEventListener {
    public zoomMode: model.ZoomMode = -1;
    public x: number = -1;
    public y: number = -1;
    public zoom: number = -1;

    public onZoomModeChanged(zoomMode: model.ZoomMode): void {
        this.zoomMode = zoomMode;
    }

    public onLayoutChanged(x: number, y: number, zoom: number): void {
        this.x = x;
        this.y = y;
        this.zoom = zoom;
    }
}

function assertAlmostEqual(actual: number, expected: number): void {
    assert(Math.abs(actual - expected) < 1e-14, `Actual: ${actual}, Expected: ${expected}.`)
}

suite("Fixed Controller", function () {
    test("Create Fixed Controller - 100%", function () {
        const fakeView = new FakeView();

        model.Controller.createFixed(600, 400, 300, 200, 10, fakeView, 1.1);

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fixed);
        assert.equal(fakeView.x, 150);
        assert.equal(fakeView.y, 100);
        assert.equal(fakeView.zoom, 1);
    });

    test("Create Fixed Controller - Corner", function () {
        const fakeView = new FakeView();

        model.Controller.createFixed(600, 400, 580, 380, 10, fakeView, 1.1);

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fixed);
        assert.equal(fakeView.x, 10);
        assert.equal(fakeView.y, 10);
        assert.equal(fakeView.zoom, 1);
    });

    test("Create Fixed Controller - Fit Horizontal", function () {
        const fakeView = new FakeView();

        model.Controller.createFixed(600, 400, 581, 380, 10, fakeView, 1.1);

        const expectedZoom = 580 / 581;

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fixed);
        assert.equal(fakeView.x, 10);
        assert.equal(fakeView.y, (400 - 380 * expectedZoom) / 2);
        assert.equal(fakeView.zoom, expectedZoom);
    });

    test("Create Fixed Controller - Fit Vertical", function () {
        const fakeView = new FakeView();

        model.Controller.createFixed(600, 400, 580, 381, 10, fakeView, 1.1);

        const expectedZoom = 380 / 381;

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fixed);
        assert.equal(fakeView.x, (600 - 580 * expectedZoom) / 2);
        assert.equal(fakeView.y, 10);
        assert.equal(fakeView.zoom, expectedZoom);
    });

    test("Create Fixed Controller - Zoom in", function () {
        const fakeView = new FakeView();
        const controller = model.Controller.createFixed(600, 400, 200, 200, 10, fakeView, 1.1);

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fixed);
        assert.equal(fakeView.x, 200);
        assert.equal(fakeView.y, 100);
        assert.equal(fakeView.zoom, 1);

        controller.zoomIn(250, 140);

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fixed);
        assert.equal(fakeView.x, 195);
        assert.equal(fakeView.y, 96);
        assert.equal(fakeView.zoom, 1.1);
    });

    test("Create Fixed Controller - Zoom out", function () {
        const fakeView = new FakeView();
        const controller = model.Controller.createFixed(600, 400, 200, 200, 10, fakeView, 1.1);

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fixed);
        assert.equal(fakeView.x, 200);
        assert.equal(fakeView.y, 100);
        assert.equal(fakeView.zoom, 1);

        controller.zoomOut(250, 140);

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fixed);
        assert.equal(fakeView.x, 200 + 50 * (1 - 1 / 1.1));
        assert.equal(fakeView.y, 100 + 40 * (1 - 1 / 1.1));
        assert.equal(fakeView.zoom, 1 / 1.1);
    });

    test("Create Fixed Controller - 100% - Toggle Overview", function () {
        const fakeView = new FakeView();
        const controller = model.Controller.createFixed(600, 400, 200, 200, 10, fakeView, 1.1);

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fixed);
        assert.equal(fakeView.x, 200);
        assert.equal(fakeView.y, 100);
        assert.equal(fakeView.zoom, 1);

        controller.toggleOverview(17, 23); // 100% -> Fit.

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fit);
        assert.equal(fakeView.x, 110);
        assert.equal(fakeView.y, 10);
        assert.equal(fakeView.zoom, 1.9);

        controller.toggleOverview(130, 20); // Fit -> 100%.

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fixed);
        assert.equal(fakeView.x, 110 + 20 * (1 - 1 / 1.9));
        assert.equal(fakeView.y, 10 + 10 * (1 - 1 / 1.9));
        assert.equal(fakeView.zoom, 1);

        controller.toggleOverview(23, 29); // 100% -> Fit.

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fit);
        assert.equal(fakeView.x, 110);
        assert.equal(fakeView.y, 10);
        assert.equal(fakeView.zoom, 1.9);
    });
});

suite("Fit Controller", function () {
    test("Create Fit Controller - Upscaling - Fit Horizontal", function () {
        const fakeView = new FakeView();

        model.Controller.createFit(600, 400, 100, 10, 10, fakeView, 1.1);

        const expectedZoom = 5.8;

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fit);
        assert.equal(fakeView.x, 10);
        assert.equal(fakeView.y, (400 - 10 * expectedZoom) / 2);
        assert.equal(fakeView.zoom, expectedZoom);
    });

    test("Create Fit Controller - Upscaling - Fit Vertical", function () {
        const fakeView = new FakeView();

        model.Controller.createFit(600, 400, 10, 100, 10, fakeView, 1.1);

        const expectedZoom = 3.8;

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fit);
        assert.equal(fakeView.x, (600 - 10 * expectedZoom) / 2);
        assert.equal(fakeView.y, 10);
        assert.equal(fakeView.zoom, expectedZoom);
    });

    test("Create Fit Controller - Downscaling - Fit Horizontal", function () {
        const fakeView = new FakeView();

        model.Controller.createFit(600, 400, 1000, 100, 10, fakeView, 1.1);

        const expectedZoom = 0.58;

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fit);
        assert.equal(fakeView.x, 10);
        assert.equal(fakeView.y, (400 - 100 * expectedZoom) / 2);
        assert.equal(fakeView.zoom, expectedZoom);
    });

    test("Create Fit Controller - Downscaling - Fit Vertical", function () {
        const fakeView = new FakeView();

        model.Controller.createFit(600, 400, 100, 1000, 10, fakeView, 1.1);

        const expectedZoom = 0.38;

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fit);
        assert.equal(fakeView.x, (600 - 100 * expectedZoom) / 2);
        assert.equal(fakeView.y, 10);
        assert.equal(fakeView.zoom, expectedZoom);
    });

    test("Create Fit Controller - Zoom in", function () {
        const fakeView = new FakeView();
        const controller = model.Controller.createFit(600, 400, 200, 200, 10, fakeView, 1.1);

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fit);
        assert.equal(fakeView.x, 110);
        assert.equal(fakeView.y, 10);
        assert.equal(fakeView.zoom, 1.9);

        controller.zoomIn(120, 30);

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fixed);
        assert.equal(fakeView.x, 109);
        assertAlmostEqual(fakeView.y, 8);
        assertAlmostEqual(fakeView.zoom, 2.09);
    });

    test("Create Fit Controller - Zoom out", function () {
        const fakeView = new FakeView();
        const controller = model.Controller.createFit(600, 400, 200, 200, 10, fakeView, 1.1);

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fit);
        assert.equal(fakeView.x, 110);
        assert.equal(fakeView.y, 10);
        assert.equal(fakeView.zoom, 1.9);

        controller.zoomOut(120, 30);

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fixed);
        assert.equal(fakeView.x, 110 + 10 * (1 - 1 / 1.1));
        assertAlmostEqual(fakeView.y, 10 + 20 * (1 - 1 / 1.1));
        assertAlmostEqual(fakeView.zoom, 19 / 11);
    });
});

suite("AutoFit Controller", function () {
    test("Create AutoFit Controller - 100%", function () {
        const fakeView = new FakeView();

        model.Controller.createAutoFit(600, 400, 300, 200, 10, fakeView, 1.1);

        assert.equal(fakeView.zoomMode, model.ZoomMode.AutoFit);
        assert.equal(fakeView.x, 150);
        assert.equal(fakeView.y, 100);
        assert.equal(fakeView.zoom, 1);
    });

    test("Create AutoFit Controller - Corner", function () {
        const fakeView = new FakeView();

        model.Controller.createAutoFit(600, 400, 580, 380, 10, fakeView, 1.1);

        assert.equal(fakeView.zoomMode, model.ZoomMode.AutoFit);
        assert.equal(fakeView.x, 10);
        assert.equal(fakeView.y, 10);
        assert.equal(fakeView.zoom, 1);
    });

    test("Create AutoFit Controller - Fit Horizontal", function () {
        const fakeView = new FakeView();

        model.Controller.createAutoFit(600, 400, 581, 380, 10, fakeView, 1.1);

        const expectedZoom = 580 / 581;

        assert.equal(fakeView.zoomMode, model.ZoomMode.AutoFit);
        assert.equal(fakeView.x, 10);
        assert.equal(fakeView.y, (400 - 380 * expectedZoom) / 2);
        assert.equal(fakeView.zoom, expectedZoom);
    });

    test("Create AutoFit Controller - Fit Vertical", function () {
        const fakeView = new FakeView();

        model.Controller.createAutoFit(600, 400, 580, 381, 10, fakeView, 1.1);

        const expectedZoom = 380 / 381;

        assert.equal(fakeView.zoomMode, model.ZoomMode.AutoFit);
        assert.equal(fakeView.x, (600 - 580 * expectedZoom) / 2);
        assert.equal(fakeView.y, 10);
        assert.equal(fakeView.zoom, expectedZoom);
    });

    test("Create AutoFit Controller - Zoom in", function () {
        const fakeView = new FakeView();
        const controller = model.Controller.createAutoFit(600, 400, 200, 200, 10, fakeView, 1.1);

        assert.equal(fakeView.zoomMode, model.ZoomMode.AutoFit);
        assert.equal(fakeView.x, 200);
        assert.equal(fakeView.y, 100);
        assert.equal(fakeView.zoom, 1);

        controller.zoomIn(250, 140);

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fixed);
        assert.equal(fakeView.x, 195);
        assert.equal(fakeView.y, 96);
        assert.equal(fakeView.zoom, 1.1);
    });

    test("Create AutoFit Controller - Zoom out", function () {
        const fakeView = new FakeView();
        const controller = model.Controller.createAutoFit(600, 400, 200, 200, 10, fakeView, 1.1);

        assert.equal(fakeView.zoomMode, model.ZoomMode.AutoFit);
        assert.equal(fakeView.x, 200);
        assert.equal(fakeView.y, 100);
        assert.equal(fakeView.zoom, 1);

        controller.zoomOut(250, 140);

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fixed);
        assert.equal(fakeView.x, 200 + 50 * (1 - 1 / 1.1));
        assert.equal(fakeView.y, 100 + 40 * (1 - 1 / 1.1));
        assert.equal(fakeView.zoom, 1 / 1.1);
    });
});
