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

suite("Model Tests", () => {
    test("Create Fixed Controller - 100%", () => {
        const fakeView = new FakeView();

        model.Controller.createFixed(600, 400, 300, 200, 10, fakeView, 1.1);

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fixed);
        assert.equal(fakeView.x, 150);
        assert.equal(fakeView.y, 100);
        assert.equal(fakeView.zoom, 1);
    });

    test("Create Fixed Controller - Corner", () => {
        const fakeView = new FakeView();

        model.Controller.createFixed(600, 400, 580, 380, 10, fakeView, 1.1);

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fixed);
        assert.equal(fakeView.x, 10);
        assert.equal(fakeView.y, 10);
        assert.equal(fakeView.zoom, 1);
    });

    test("Create Fixed Controller - Fit Horizontal", () => {
        const fakeView = new FakeView();

        model.Controller.createFixed(600, 400, 581, 380, 10, fakeView, 1.1);

        const expectedZoom = 580 / 581;

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fixed);
        assert.equal(fakeView.x, 10);
        assert.equal(fakeView.y, (400 - 380 * expectedZoom) / 2);
        assert.equal(fakeView.zoom, expectedZoom);
    });

    test("Create Fixed Controller - Fit Vertical", () => {
        const fakeView = new FakeView();

        model.Controller.createFixed(600, 400, 580, 381, 10, fakeView, 1.1);

        const expectedZoom = 380 / 381;

        assert.equal(fakeView.zoomMode, model.ZoomMode.Fixed);
        assert.equal(fakeView.x, (600 - 580 * expectedZoom) / 2);
        assert.equal(fakeView.y, 10);
        assert.equal(fakeView.zoom, expectedZoom);
    });
});
