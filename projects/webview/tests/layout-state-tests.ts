import { AutoLayout, FixedLayout, LayoutState } from "../src/layout-state";
import { type LayoutView, ScaleMode } from "../src/layout-view";
import { Size } from "../src/layout";
import assert from "assert";

interface ViewDump {
    isCenter: boolean | undefined;
    isIdentity: boolean | undefined;
    scaleMode: ScaleMode | undefined;
    imageX: number | undefined;
    imageY: number | undefined;
    imageDisplayWidth: number | undefined;
    imageDisplayHeight: number | undefined;
    imageScale: number | undefined;
}

class View implements LayoutView {
    public isCenter: boolean | undefined = undefined;
    public isIdentity: boolean | undefined = undefined;
    public scaleMode: ScaleMode | undefined = undefined;
    public imageX: number | undefined = undefined;
    public imageY: number | undefined = undefined;
    public imageDisplayWidth: number | undefined = undefined;
    public imageDisplayHeight: number | undefined = undefined;
    public imageScale: number | undefined = undefined;

    // `LayoutView` interface.

    public setIsCenter(value: boolean): void {
        assert.notStrictEqual(this.isCenter, value);

        this.isCenter = value;
    }

    public setIsIdentity(value: boolean): void {
        assert.notStrictEqual(this.isIdentity, value);

        this.isIdentity = value;
    }

    public setScaleMode(value: ScaleMode): void {
        assert.notStrictEqual(this.scaleMode, value);

        this.scaleMode = value;
    }

    public setImagePosition(x: number, y: number): void {
        assert.notStrictEqual(this.imageX, x);
        assert.notStrictEqual(this.imageY, y);

        this.imageX = x;
        this.imageY = y;
    }

    public setImageDisplaySize(width: number, height: number): void {
        assert.notStrictEqual(this.imageDisplayWidth, width);
        assert.notStrictEqual(this.imageDisplayHeight, height);

        this.imageDisplayWidth = width;
        this.imageDisplayHeight = height;
    }

    public setImageScale(value: number): void {
        assert.notStrictEqual(this.imageScale, value);

        this.imageScale = value;
    }
}

class Controller {
    private readonly state: LayoutState;
    private readonly view = new View();

    public constructor(
        viewWidth: number,
        viewHeight: number,
        imageWidth: number,
        imageHeight: number,
        layout: FixedLayout | AutoLayout,
        imageX: number,
        imageY: number,
        isIdentity: boolean,
        scale: number,
    ) {
        this.state = new LayoutState(
            viewWidth,
            viewHeight,
            imageWidth,
            imageHeight,
            layout,
            imageX,
            imageY,
            isIdentity,
            scale,
        );

        this.state.initializeView(this.view);
    }

    public onViewSizeChanged(width: number, height: number): ViewDump {
        this.state.onViewSizeChanged(this.view, width, height);

        return this.dump();
    }

    public onImageSizeChanged(width: number, height: number): ViewDump {
        this.state.onImageSizeChanged(this.view, width, height);

        return this.dump();
    }

    public toggleIsCenter(): ViewDump {
        this.view.isCenter = !this.view.isCenter;
        this.state.toggleIsCenter(this.view);

        return this.dump();
    }

    public toggleIsIdentity(): ViewDump {
        this.view.isIdentity = !this.view.isIdentity;
        this.state.toggleIsIdentity(this.view);

        return this.dump();
    }

    public switchToFixedLayout(): ViewDump {
        this.view.scaleMode = ScaleMode.Fixed;
        this.state.switchToFixedLayout(this.view);

        return this.dump();
    }

    public switchToFitLayout(): ViewDump {
        this.view.scaleMode = ScaleMode.Fit;
        this.state.switchToFitLayout(this.view);

        return this.dump();
    }

    public switchToAutoFitLayout(): ViewDump {
        this.view.scaleMode = ScaleMode.AutoFit;
        this.state.switchToAutoFitLayout(this.view);

        return this.dump();
    }

    public startDrag(x: number, y: number): (x: number, y: number) => ViewDump {
        const callback = this.state.startDrag(x, y);

        return (x, y) => {
            callback(this.view, x, y);

            return this.dump();
        };
    }

    public toggleIsIdentityAt(x: number, y: number): ViewDump {
        this.state.toggleIsIdentityAt(this.view, x, y);

        return this.dump();
    }

    public setScale(scale: number): ViewDump {
        this.state.setScale(this.view, scale);

        return this.dump();
    }

    public setScaleAt(x: number, y: number, scale: number): ViewDump {
        this.state.setScaleAt(this.view, x, y, scale);

        return this.dump();
    }

    public dump(): ViewDump {
        const checkView = new View();

        this.state.initializeView(checkView);

        assert.deepStrictEqual(this.view, checkView);

        return { ...this.view };
    }
}

function getFixedView(
    imageWidth: number,
    imageHeight: number,
    savedIsCenter: boolean,
    savedImageX: number,
    savedImageY: number,
    savedImageDisplayWidth: number,
    savedImageDisplayHeight: number,
    savedIsIdentity: boolean,
    savedScale: number,
) {
    let altImageDisplayWidth = imageWidth;
    let altImageDisplayHeight = imageHeight;
    let altImageScale;

    if (savedIsIdentity) {
        altImageScale = 1;
    } else {
        altImageDisplayWidth *= savedScale;
        altImageDisplayHeight *= savedScale;
        altImageScale = savedScale;
    }

    let altImageX;
    let altImageY;

    if (savedIsCenter) {
        altImageX = 0;
        altImageY = 0;
    } else {
        altImageX = (savedImageX * altImageDisplayWidth) / savedImageDisplayWidth;
        altImageY = (savedImageY * altImageDisplayHeight) / savedImageDisplayHeight;
    }

    return {
        isCenter: savedIsCenter,
        isIdentity: savedIsIdentity,
        scaleMode: ScaleMode.Fixed,
        imageX: altImageX,
        imageY: altImageY,
        imageDisplayWidth: altImageDisplayWidth,
        imageDisplayHeight: altImageDisplayHeight,
        imageScale: altImageScale,
    };
}

describe("LayoutState tests", () => {
    describe("On view size changed", () => {
        describe("Fixed layout", () => {
            const controllers = [
                {
                    name: "Free",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(null), 11, 13, false, 2),
                    initialState: {
                        isCenter: false,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 11,
                        imageY: 13,
                        imageDisplayWidth: 100,
                        imageDisplayHeight: 140,
                        imageScale: 2,
                    },
                },
                {
                    name: "Center",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(new Size(17, 19)), 11, 13, false, 2),
                    initialState: {
                        isCenter: true,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 100,
                        imageDisplayHeight: 140,
                        imageScale: 2,
                    },
                },
                {
                    name: "Identity",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(null), 11, 13, true, 2),
                    initialState: {
                        isCenter: false,
                        isIdentity: true,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 11,
                        imageY: 13,
                        imageDisplayWidth: 50,
                        imageDisplayHeight: 70,
                        imageScale: 1,
                    },
                },
                {
                    name: "Center identity",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(new Size(17, 19)), 11, 13, true, 2),
                    initialState: {
                        isCenter: true,
                        isIdentity: true,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 50,
                        imageDisplayHeight: 70,
                        imageScale: 1,
                    },
                },
            ];

            for (const { name, controller, initialState } of controllers) {
                it(name, () => {
                    assert.deepStrictEqual(controller.dump(), initialState);
                    assert.deepStrictEqual(controller.onViewSizeChanged(110, 130), initialState);
                });
            }
        });

        describe("Fit layout", () => {
            const controllers = [
                { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
            ];

            for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                it(name, () => {
                    const controller = new Controller(
                        20,
                        30,
                        50,
                        70,
                        new AutoLayout(false, savedIsCenter, new Size(17, 19)),
                        11,
                        13,
                        savedIsIdentity,
                        2,
                    );

                    const initialState = {
                        isCenter: true,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fit,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 20,
                        imageDisplayHeight: 28,
                        imageScale: 0.4,
                    };

                    assert.deepStrictEqual(controller.dump(), initialState);

                    assert.deepStrictEqual(controller.onViewSizeChanged(110, 130), {
                        ...initialState,
                        imageDisplayWidth: 50 * (130 / 70),
                        imageDisplayHeight: 130,
                        imageScale: 130 / 70,
                    });
                });
            }
        });

        describe("Auto fit layout", () => {
            describe("Identity", () => {
                describe("To identity", () => {
                    const controllers = [
                        { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                        { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                        { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                        { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                    ];

                    for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                        it(name, () => {
                            const controller = new Controller(
                                200,
                                300,
                                50,
                                70,
                                new AutoLayout(true, savedIsCenter, new Size(17, 19)),
                                11,
                                13,
                                savedIsIdentity,
                                2,
                            );

                            const initialState = {
                                isCenter: true,
                                isIdentity: true,
                                scaleMode: ScaleMode.AutoFit,
                                imageX: 0,
                                imageY: 0,
                                imageDisplayWidth: 50,
                                imageDisplayHeight: 70,
                                imageScale: 1,
                            };

                            assert.deepStrictEqual(controller.dump(), initialState);
                            assert.deepStrictEqual(controller.onViewSizeChanged(2000, 3000), initialState);
                        });
                    }
                });

                describe("To fit", () => {
                    const controllers = [
                        { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                        { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                        { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                        { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                    ];

                    for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                        it(name, () => {
                            const controller = new Controller(
                                200,
                                300,
                                50,
                                70,
                                new AutoLayout(true, savedIsCenter, new Size(17, 19)),
                                11,
                                13,
                                savedIsIdentity,
                                2,
                            );

                            const initialState = {
                                isCenter: true,
                                isIdentity: true,
                                scaleMode: ScaleMode.AutoFit,
                                imageX: 0,
                                imageY: 0,
                                imageDisplayWidth: 50,
                                imageDisplayHeight: 70,
                                imageScale: 1,
                            };

                            assert.deepStrictEqual(controller.dump(), initialState);

                            assert.deepStrictEqual(controller.onViewSizeChanged(20, 30), {
                                ...initialState,
                                isIdentity: false,
                                imageDisplayWidth: 20,
                                imageDisplayHeight: 28,
                                imageScale: 0.4,
                            });
                        });
                    }
                });
            });

            describe("Fit", () => {
                describe("To identity", () => {
                    const controllers = [
                        { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                        { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                        { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                        { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                    ];

                    for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                        it(name, () => {
                            const controller = new Controller(
                                20,
                                30,
                                50,
                                70,
                                new AutoLayout(true, savedIsCenter, new Size(17, 19)),
                                11,
                                13,
                                savedIsIdentity,
                                2,
                            );

                            const initialState = {
                                isCenter: true,
                                isIdentity: false,
                                scaleMode: ScaleMode.AutoFit,
                                imageX: 0,
                                imageY: 0,
                                imageDisplayWidth: 20,
                                imageDisplayHeight: 28,
                                imageScale: 0.4,
                            };

                            assert.deepStrictEqual(controller.dump(), initialState);

                            assert.deepStrictEqual(controller.onViewSizeChanged(200, 300), {
                                ...initialState,
                                isIdentity: true,
                                imageDisplayWidth: 50,
                                imageDisplayHeight: 70,
                                imageScale: 1,
                            });
                        });
                    }
                });

                describe("To fit", () => {
                    const controllers = [
                        { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                        { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                        { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                        { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                    ];

                    for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                        it(name, () => {
                            const controller = new Controller(
                                20,
                                30,
                                50,
                                70,
                                new AutoLayout(true, savedIsCenter, new Size(17, 19)),
                                11,
                                13,
                                savedIsIdentity,
                                2,
                            );

                            const initialState = {
                                isCenter: true,
                                isIdentity: false,
                                scaleMode: ScaleMode.AutoFit,
                                imageX: 0,
                                imageY: 0,
                                imageDisplayWidth: 20,
                                imageDisplayHeight: 28,
                                imageScale: 0.4,
                            };

                            assert.deepStrictEqual(controller.dump(), initialState);

                            assert.deepStrictEqual(controller.onViewSizeChanged(40, 60), {
                                ...initialState,
                                imageDisplayWidth: 40,
                                imageDisplayHeight: 56,
                                imageScale: 0.8,
                            });
                        });
                    }
                });
            });
        });
    });

    describe("On image size changed", () => {
        describe("Fixed layout", () => {
            const controllers = [
                {
                    name: "Free",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(null), 11, 13, false, 2),
                    initialState: {
                        isCenter: false,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 11,
                        imageY: 13,
                        imageDisplayWidth: 100,
                        imageDisplayHeight: 140,
                        imageScale: 2,
                    },
                },
                {
                    name: "Center",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(new Size(17, 19)), 11, 13, false, 2),
                    initialState: {
                        isCenter: true,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 100,
                        imageDisplayHeight: 140,
                        imageScale: 2,
                    },
                },
                {
                    name: "Identity",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(null), 11, 13, true, 2),
                    initialState: {
                        isCenter: false,
                        isIdentity: true,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 11,
                        imageY: 13,
                        imageDisplayWidth: 50,
                        imageDisplayHeight: 70,
                        imageScale: 1,
                    },
                },
                {
                    name: "Center identity",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(new Size(17, 19)), 11, 13, true, 2),
                    initialState: {
                        isCenter: true,
                        isIdentity: true,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 50,
                        imageDisplayHeight: 70,
                        imageScale: 1,
                    },
                },
            ];

            for (const { name, controller, initialState } of controllers) {
                it(name, () => {
                    assert.deepStrictEqual(controller.dump(), initialState);

                    assert.deepStrictEqual(controller.onImageSizeChanged(25, 140), {
                        ...initialState,
                        imageX: initialState.imageX / 2,
                        imageY: initialState.imageY * 2,
                        imageDisplayWidth: 25 * initialState.imageScale,
                        imageDisplayHeight: 140 * initialState.imageScale,
                    });
                });
            }
        });

        describe("Fit layout", () => {
            const controllers = [
                { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
            ];

            for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                it(name, () => {
                    const controller = new Controller(
                        20,
                        30,
                        50,
                        70,
                        new AutoLayout(false, savedIsCenter, new Size(17, 19)),
                        11,
                        13,
                        savedIsIdentity,
                        2,
                    );

                    const initialState = {
                        isCenter: true,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fit,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 20,
                        imageDisplayHeight: 28,
                        imageScale: 0.4,
                    };

                    assert.deepStrictEqual(controller.dump(), initialState);

                    assert.deepStrictEqual(controller.onImageSizeChanged(30, 60), {
                        ...initialState,
                        imageDisplayWidth: 15,
                        imageDisplayHeight: 30,
                        imageScale: 0.5,
                    });
                });
            }
        });

        describe("Auto fit layout", () => {
            describe("Identity", () => {
                describe("To identity", () => {
                    const controllers = [
                        { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                        { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                        { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                        { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                    ];

                    for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                        it(name, () => {
                            const controller = new Controller(
                                200,
                                300,
                                50,
                                70,
                                new AutoLayout(true, savedIsCenter, new Size(17, 19)),
                                11,
                                13,
                                savedIsIdentity,
                                2,
                            );

                            const initialState = {
                                isCenter: true,
                                isIdentity: true,
                                scaleMode: ScaleMode.AutoFit,
                                imageX: 0,
                                imageY: 0,
                                imageDisplayWidth: 50,
                                imageDisplayHeight: 70,
                                imageScale: 1,
                            };

                            assert.deepStrictEqual(controller.dump(), initialState);

                            assert.deepStrictEqual(controller.onImageSizeChanged(100, 120), {
                                ...initialState,
                                imageDisplayWidth: 100,
                                imageDisplayHeight: 120,
                            });
                        });
                    }
                });

                describe("To fit", () => {
                    const controllers = [
                        { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                        { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                        { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                        { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                    ];

                    for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                        it(name, () => {
                            const controller = new Controller(
                                200,
                                300,
                                50,
                                70,
                                new AutoLayout(true, savedIsCenter, new Size(17, 19)),
                                11,
                                13,
                                savedIsIdentity,
                                2,
                            );

                            const initialState = {
                                isCenter: true,
                                isIdentity: true,
                                scaleMode: ScaleMode.AutoFit,
                                imageX: 0,
                                imageY: 0,
                                imageDisplayWidth: 50,
                                imageDisplayHeight: 70,
                                imageScale: 1,
                            };

                            assert.deepStrictEqual(controller.dump(), initialState);

                            assert.deepStrictEqual(controller.onImageSizeChanged(500, 700), {
                                ...initialState,
                                isIdentity: false,
                                imageDisplayWidth: 200,
                                imageDisplayHeight: 280,
                                imageScale: 0.4,
                            });
                        });
                    }
                });
            });

            describe("Fit", () => {
                describe("To identity", () => {
                    const controllers = [
                        { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                        { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                        { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                        { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                    ];

                    for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                        it(name, () => {
                            const controller = new Controller(
                                20,
                                30,
                                50,
                                70,
                                new AutoLayout(true, savedIsCenter, new Size(17, 19)),
                                11,
                                13,
                                savedIsIdentity,
                                2,
                            );

                            const initialState = {
                                isCenter: true,
                                isIdentity: false,
                                scaleMode: ScaleMode.AutoFit,
                                imageX: 0,
                                imageY: 0,
                                imageDisplayWidth: 20,
                                imageDisplayHeight: 28,
                                imageScale: 0.4,
                            };

                            assert.deepStrictEqual(controller.dump(), initialState);

                            assert.deepStrictEqual(controller.onImageSizeChanged(5, 7), {
                                ...initialState,
                                isIdentity: true,
                                imageDisplayWidth: 5,
                                imageDisplayHeight: 7,
                                imageScale: 1,
                            });
                        });
                    }
                });

                describe("To fit", () => {
                    const controllers = [
                        { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                        { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                        { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                        { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                    ];

                    for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                        it(name, () => {
                            const controller = new Controller(
                                20,
                                30,
                                50,
                                70,
                                new AutoLayout(true, savedIsCenter, new Size(17, 19)),
                                11,
                                13,
                                savedIsIdentity,
                                2,
                            );

                            const initialState = {
                                isCenter: true,
                                isIdentity: false,
                                scaleMode: ScaleMode.AutoFit,
                                imageX: 0,
                                imageY: 0,
                                imageDisplayWidth: 20,
                                imageDisplayHeight: 28,
                                imageScale: 0.4,
                            };

                            assert.deepStrictEqual(controller.dump(), initialState);

                            assert.deepStrictEqual(controller.onImageSizeChanged(30, 60), {
                                ...initialState,
                                imageDisplayWidth: 15,
                                imageDisplayHeight: 30,
                                imageScale: 0.5,
                            });
                        });
                    }
                });
            });
        });
    });

    describe("Toggle is center", () => {
        describe("Fixed layout", () => {
            const controllers = [
                {
                    name: "Free",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(null), 11, 13, false, 2),
                    initialState: {
                        isCenter: false,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 11,
                        imageY: 13,
                        imageDisplayWidth: 100,
                        imageDisplayHeight: 140,
                        imageScale: 2,
                    },
                    altState: {
                        isCenter: true,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 100,
                        imageDisplayHeight: 140,
                        imageScale: 2,
                    },
                },
                {
                    name: "Center",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(new Size(17, 19)), 11, 13, false, 2),
                    initialState: {
                        isCenter: true,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 100,
                        imageDisplayHeight: 140,
                        imageScale: 2,
                    },
                    altState: {
                        isCenter: false,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: (50 * 2 * 11) / 17,
                        imageY: (70 * 2 * 13) / 19,
                        imageDisplayWidth: 100,
                        imageDisplayHeight: 140,
                        imageScale: 2,
                    },
                },
                {
                    name: "Identity",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(null), 11, 13, true, 2),
                    initialState: {
                        isCenter: false,
                        isIdentity: true,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 11,
                        imageY: 13,
                        imageDisplayWidth: 50,
                        imageDisplayHeight: 70,
                        imageScale: 1,
                    },
                    altState: {
                        isCenter: true,
                        isIdentity: true,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 50,
                        imageDisplayHeight: 70,
                        imageScale: 1,
                    },
                },
                {
                    name: "Center identity",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(new Size(17, 19)), 11, 13, true, 2),
                    initialState: {
                        isCenter: true,
                        isIdentity: true,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 50,
                        imageDisplayHeight: 70,
                        imageScale: 1,
                    },
                    altState: {
                        isCenter: false,
                        isIdentity: true,
                        scaleMode: ScaleMode.Fixed,
                        imageX: (11 * 50) / 17,
                        imageY: (13 * 70) / 19,
                        imageDisplayWidth: 50,
                        imageDisplayHeight: 70,
                        imageScale: 1,
                    },
                },
            ];

            for (const { name, controller, initialState, altState } of controllers) {
                it(name, () => {
                    assert.deepStrictEqual(controller.dump(), initialState);
                    assert.deepStrictEqual(controller.toggleIsCenter(), altState);
                    assert.deepStrictEqual(controller.toggleIsCenter(), initialState);
                    assert.deepStrictEqual(controller.toggleIsCenter(), altState);
                    assert.deepStrictEqual(controller.toggleIsCenter(), initialState);
                });
            }
        });

        describe("Fit layout", () => {
            const controllers = [
                { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
            ];

            for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                it(name, () => {
                    const controller = new Controller(
                        20,
                        30,
                        50,
                        70,
                        new AutoLayout(false, savedIsCenter, new Size(17, 19)),
                        11,
                        13,
                        savedIsIdentity,
                        2,
                    );

                    const initialState = {
                        isCenter: true,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fit,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 20,
                        imageDisplayHeight: 28,
                        imageScale: 0.4,
                    };

                    const altState = {
                        ...initialState,
                        isCenter: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: (20 * 11) / 17,
                        imageY: (28 * 13) / 19,
                    };

                    const altState2 = { ...initialState, scaleMode: ScaleMode.Fixed };

                    assert.deepStrictEqual(controller.dump(), initialState);
                    assert.deepStrictEqual(controller.toggleIsCenter(), altState);
                    assert.deepStrictEqual(controller.toggleIsCenter(), altState2);
                    assert.deepStrictEqual(controller.toggleIsCenter(), altState);
                    assert.deepStrictEqual(controller.toggleIsCenter(), altState2);
                });
            }
        });

        describe("Auto fit layout", () => {
            describe("Identity", () => {
                const controllers = [
                    { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                    { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                    { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                    { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                ];

                for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                    it(name, () => {
                        const controller = new Controller(
                            200,
                            300,
                            50,
                            70,
                            new AutoLayout(true, savedIsCenter, new Size(17, 19)),
                            11,
                            13,
                            savedIsIdentity,
                            2,
                        );

                        const initialState = {
                            isCenter: true,
                            isIdentity: true,
                            scaleMode: ScaleMode.AutoFit,
                            imageX: 0,
                            imageY: 0,
                            imageDisplayWidth: 50,
                            imageDisplayHeight: 70,
                            imageScale: 1,
                        };

                        const altState = {
                            ...initialState,
                            isCenter: false,
                            scaleMode: ScaleMode.Fixed,
                            imageX: (50 * 11) / 17,
                            imageY: (70 * 13) / 19,
                        };

                        const altState2 = {
                            ...initialState,
                            scaleMode: ScaleMode.Fixed,
                        };

                        assert.deepStrictEqual(controller.dump(), initialState);
                        assert.deepStrictEqual(controller.toggleIsCenter(), altState);
                        assert.deepStrictEqual(controller.toggleIsCenter(), altState2);
                        assert.deepStrictEqual(controller.toggleIsCenter(), altState);
                        assert.deepStrictEqual(controller.toggleIsCenter(), altState2);
                    });
                }
            });

            describe("Fit", () => {
                const controllers = [
                    { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                    { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                    { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                    { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                ];

                for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                    it(name, () => {
                        const controller = new Controller(
                            20,
                            30,
                            50,
                            70,
                            new AutoLayout(true, savedIsCenter, new Size(17, 19)),
                            11,
                            13,
                            savedIsIdentity,
                            2,
                        );

                        const initialState = {
                            isCenter: true,
                            isIdentity: false,
                            scaleMode: ScaleMode.AutoFit,
                            imageX: 0,
                            imageY: 0,
                            imageDisplayWidth: 20,
                            imageDisplayHeight: 28,
                            imageScale: 0.4,
                        };

                        const altState = {
                            ...initialState,
                            isCenter: false,
                            scaleMode: ScaleMode.Fixed,
                            imageX: (20 * 11) / 17,
                            imageY: (28 * 13) / 19,
                        };

                        const altState2 = {
                            ...initialState,
                            scaleMode: ScaleMode.Fixed,
                        };

                        assert.deepStrictEqual(controller.dump(), initialState);
                        assert.deepStrictEqual(controller.toggleIsCenter(), altState);
                        assert.deepStrictEqual(controller.toggleIsCenter(), altState2);
                        assert.deepStrictEqual(controller.toggleIsCenter(), altState);
                        assert.deepStrictEqual(controller.toggleIsCenter(), altState2);
                    });
                }
            });
        });
    });

    describe("Toggle is identity", () => {
        describe("Fixed layout", () => {
            const controllers = [
                {
                    name: "Free",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(null), 11, 13, false, 2),
                    initialState: {
                        isCenter: false,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 11,
                        imageY: 13,
                        imageDisplayWidth: 100,
                        imageDisplayHeight: 140,
                        imageScale: 2,
                    },
                    altState: {
                        isCenter: false,
                        isIdentity: true,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 5.5,
                        imageY: 6.5,
                        imageDisplayWidth: 50,
                        imageDisplayHeight: 70,
                        imageScale: 1,
                    },
                },
                {
                    name: "Center",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(new Size(17, 19)), 11, 13, false, 2),
                    initialState: {
                        isCenter: true,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 100,
                        imageDisplayHeight: 140,
                        imageScale: 2,
                    },
                    altState: {
                        isCenter: true,
                        isIdentity: true,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 50,
                        imageDisplayHeight: 70,
                        imageScale: 1,
                    },
                },
                {
                    name: "Identity",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(null), 11, 13, true, 2),
                    initialState: {
                        isCenter: false,
                        isIdentity: true,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 11,
                        imageY: 13,
                        imageDisplayWidth: 50,
                        imageDisplayHeight: 70,
                        imageScale: 1,
                    },
                    altState: {
                        isCenter: false,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 22,
                        imageY: 26,
                        imageDisplayWidth: 100,
                        imageDisplayHeight: 140,
                        imageScale: 2,
                    },
                },
                {
                    name: "Center identity",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(new Size(17, 19)), 11, 13, true, 2),
                    initialState: {
                        isCenter: true,
                        isIdentity: true,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 50,
                        imageDisplayHeight: 70,
                        imageScale: 1,
                    },
                    altState: {
                        isCenter: true,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 100,
                        imageDisplayHeight: 140,
                        imageScale: 2,
                    },
                },
            ];

            for (const { name, controller, initialState, altState } of controllers) {
                it(name, () => {
                    assert.deepStrictEqual(controller.dump(), initialState);
                    assert.deepStrictEqual(controller.toggleIsIdentity(), altState);
                    assert.deepStrictEqual(controller.toggleIsIdentity(), initialState);
                    assert.deepStrictEqual(controller.toggleIsIdentity(), altState);
                    assert.deepStrictEqual(controller.toggleIsIdentity(), initialState);
                });
            }
        });

        describe("Fit layout", () => {
            const controllers = [
                { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
            ];

            for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                it(name, () => {
                    const controller = new Controller(
                        20,
                        30,
                        50,
                        70,
                        new AutoLayout(false, savedIsCenter, new Size(17, 19)),
                        11,
                        13,
                        savedIsIdentity,
                        2,
                    );

                    const initialState = {
                        isCenter: true,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fit,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 20,
                        imageDisplayHeight: 28,
                        imageScale: 0.4,
                    };

                    const altState = {
                        ...initialState,
                        isIdentity: true,
                        scaleMode: ScaleMode.Fixed,
                        imageDisplayWidth: 50,
                        imageDisplayHeight: 70,
                        imageScale: 1,
                    };

                    const altState2 = { ...initialState, scaleMode: ScaleMode.Fixed };

                    assert.deepStrictEqual(controller.dump(), initialState);
                    assert.deepStrictEqual(controller.toggleIsIdentity(), altState);
                    assert.deepStrictEqual(controller.toggleIsIdentity(), altState2);
                    assert.deepStrictEqual(controller.toggleIsIdentity(), altState);
                    assert.deepStrictEqual(controller.toggleIsIdentity(), altState2);
                });
            }
        });

        describe("Auto fit layout", () => {
            describe("Identity", () => {
                const controllers = [
                    { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                    { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                    { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                    { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                ];

                for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                    it(name, () => {
                        const controller = new Controller(
                            200,
                            300,
                            50,
                            70,
                            new AutoLayout(true, savedIsCenter, new Size(17, 19)),
                            11,
                            13,
                            savedIsIdentity,
                            2,
                        );

                        const initialState = {
                            isCenter: true,
                            isIdentity: true,
                            scaleMode: ScaleMode.AutoFit,
                            imageX: 0,
                            imageY: 0,
                            imageDisplayWidth: 50,
                            imageDisplayHeight: 70,
                            imageScale: 1,
                        };

                        const altState = {
                            ...initialState,
                            isIdentity: false,
                            scaleMode: ScaleMode.Fixed,
                            imageDisplayWidth: 100,
                            imageDisplayHeight: 140,
                            imageScale: 2,
                        };

                        const altState2 = {
                            ...initialState,
                            scaleMode: ScaleMode.Fixed,
                        };

                        assert.deepStrictEqual(controller.dump(), initialState);
                        assert.deepStrictEqual(controller.toggleIsIdentity(), altState);
                        assert.deepStrictEqual(controller.toggleIsIdentity(), altState2);
                        assert.deepStrictEqual(controller.toggleIsIdentity(), altState);
                        assert.deepStrictEqual(controller.toggleIsIdentity(), altState2);
                    });
                }
            });

            describe("Fit", () => {
                const controllers = [
                    { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                    { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                    { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                    { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                ];

                for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                    it(name, () => {
                        const controller = new Controller(
                            20,
                            30,
                            50,
                            70,
                            new AutoLayout(true, savedIsCenter, new Size(17, 19)),
                            11,
                            13,
                            savedIsIdentity,
                            2,
                        );

                        const initialState = {
                            isCenter: true,
                            isIdentity: false,
                            scaleMode: ScaleMode.AutoFit,
                            imageX: 0,
                            imageY: 0,
                            imageDisplayWidth: 20,
                            imageDisplayHeight: 28,
                            imageScale: 0.4,
                        };

                        const altState = {
                            ...initialState,
                            isIdentity: true,
                            scaleMode: ScaleMode.Fixed,
                            imageDisplayWidth: 50,
                            imageDisplayHeight: 70,
                            imageScale: 1,
                        };

                        const altState2 = {
                            ...initialState,
                            scaleMode: ScaleMode.Fixed,
                        };

                        assert.deepStrictEqual(controller.dump(), initialState);
                        assert.deepStrictEqual(controller.toggleIsIdentity(), altState);
                        assert.deepStrictEqual(controller.toggleIsIdentity(), altState2);
                        assert.deepStrictEqual(controller.toggleIsIdentity(), altState);
                        assert.deepStrictEqual(controller.toggleIsIdentity(), altState2);
                    });
                }
            });
        });
    });

    describe("Switch to fixed layout", () => {
        describe("Fit layout", () => {
            const controllers = [
                { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
            ];

            for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                it(name, () => {
                    const controller = new Controller(
                        20,
                        30,
                        50,
                        70,
                        new AutoLayout(false, savedIsCenter, new Size(17, 19)),
                        11,
                        13,
                        savedIsIdentity,
                        2,
                    );

                    const initialState = {
                        isCenter: true,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fit,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 20,
                        imageDisplayHeight: 28,
                        imageScale: 0.4,
                    };

                    const altState = getFixedView(50, 70, savedIsCenter, 11, 13, 17, 19, savedIsIdentity, 2);

                    const altState2 = {
                        isCenter: false,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: (11 * 100) / 17,
                        imageY: (13 * 140) / 19,
                        imageDisplayWidth: 100,
                        imageDisplayHeight: 140,
                        imageScale: 2,
                    };

                    assert.deepStrictEqual(controller.dump(), initialState);
                    assert.deepStrictEqual(controller.switchToFixedLayout(), altState);

                    if (savedIsCenter) {
                        controller.toggleIsCenter();
                    }

                    if (savedIsIdentity) {
                        controller.toggleIsIdentity();
                    }

                    assert.deepStrictEqual(controller.dump(), altState2);
                });
            }
        });

        describe("Auto fit layout", () => {
            describe("Identity", () => {
                const controllers = [
                    { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                    { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                    { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                    { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                ];

                for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                    it(name, () => {
                        const controller = new Controller(
                            200,
                            300,
                            50,
                            70,
                            new AutoLayout(true, savedIsCenter, new Size(17, 19)),
                            11,
                            13,
                            savedIsIdentity,
                            2,
                        );

                        const initialState = {
                            isCenter: true,
                            isIdentity: true,
                            scaleMode: ScaleMode.AutoFit,
                            imageX: 0,
                            imageY: 0,
                            imageDisplayWidth: 50,
                            imageDisplayHeight: 70,
                            imageScale: 1,
                        };

                        const altState = getFixedView(50, 70, savedIsCenter, 11, 13, 17, 19, savedIsIdentity, 2);

                        const altState2 = {
                            isCenter: false,
                            isIdentity: false,
                            scaleMode: ScaleMode.Fixed,
                            imageX: (11 * 100) / 17,
                            imageY: (13 * 140) / 19,
                            imageDisplayWidth: 100,
                            imageDisplayHeight: 140,
                            imageScale: 2,
                        };

                        assert.deepStrictEqual(controller.dump(), initialState);
                        assert.deepStrictEqual(controller.switchToFixedLayout(), altState);

                        if (savedIsCenter) {
                            controller.toggleIsCenter();
                        }

                        if (savedIsIdentity) {
                            controller.toggleIsIdentity();
                        }

                        assert.deepStrictEqual(controller.dump(), altState2);
                    });
                }
            });

            describe("Fit", () => {
                const controllers = [
                    { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                    { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                    { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                    { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                ];

                for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                    it(name, () => {
                        const controller = new Controller(
                            20,
                            30,
                            50,
                            70,
                            new AutoLayout(true, savedIsCenter, new Size(17, 19)),
                            11,
                            13,
                            savedIsIdentity,
                            2,
                        );

                        const initialState = {
                            isCenter: true,
                            isIdentity: false,
                            scaleMode: ScaleMode.AutoFit,
                            imageX: 0,
                            imageY: 0,
                            imageDisplayWidth: 20,
                            imageDisplayHeight: 28,
                            imageScale: 0.4,
                        };

                        const altState = getFixedView(50, 70, savedIsCenter, 11, 13, 17, 19, savedIsIdentity, 2);

                        const altState2 = {
                            isCenter: false,
                            isIdentity: false,
                            scaleMode: ScaleMode.Fixed,
                            imageX: (11 * 100) / 17,
                            imageY: (13 * 140) / 19,
                            imageDisplayWidth: 100,
                            imageDisplayHeight: 140,
                            imageScale: 2,
                        };

                        assert.deepStrictEqual(controller.dump(), initialState);
                        assert.deepStrictEqual(controller.switchToFixedLayout(), altState);

                        if (savedIsCenter) {
                            controller.toggleIsCenter();
                        }

                        if (savedIsIdentity) {
                            controller.toggleIsIdentity();
                        }

                        assert.deepStrictEqual(controller.dump(), altState2);
                    });
                }
            });
        });
    });

    describe("Switch to fit layout", () => {
        describe("Fixed layout", () => {
            const controllers = [
                {
                    name: "Free",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(null), 11, 13, false, 2),
                    initialState: {
                        isCenter: false,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 11,
                        imageY: 13,
                        imageDisplayWidth: 100,
                        imageDisplayHeight: 140,
                        imageScale: 2,
                    },
                },
                {
                    name: "Center",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(new Size(17, 19)), 11, 13, false, 2),
                    initialState: {
                        isCenter: true,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 100,
                        imageDisplayHeight: 140,
                        imageScale: 2,
                    },
                },
                {
                    name: "Identity",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(null), 11, 13, true, 2),
                    initialState: {
                        isCenter: false,
                        isIdentity: true,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 11,
                        imageY: 13,
                        imageDisplayWidth: 50,
                        imageDisplayHeight: 70,
                        imageScale: 1,
                    },
                },
                {
                    name: "Center identity",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(new Size(17, 19)), 11, 13, true, 2),
                    initialState: {
                        isCenter: true,
                        isIdentity: true,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 50,
                        imageDisplayHeight: 70,
                        imageScale: 1,
                    },
                },
            ];

            const altState = {
                isCenter: true,
                isIdentity: false,
                scaleMode: ScaleMode.Fit,
                imageX: 0,
                imageY: 0,
                imageDisplayWidth: 20,
                imageDisplayHeight: 28,
                imageScale: 0.4,
            };

            for (const { name, controller, initialState } of controllers) {
                it(name, () => {
                    assert.deepStrictEqual(controller.dump(), initialState);
                    assert.deepStrictEqual(controller.switchToFitLayout(), altState);
                    assert.deepStrictEqual(controller.switchToFixedLayout(), initialState);

                    if (initialState.isCenter) {
                        controller.toggleIsCenter();
                    }

                    if (initialState.isIdentity) {
                        controller.toggleIsIdentity();
                    }

                    let fixedImageX;
                    let fixedImageY;

                    if (initialState.isCenter) {
                        fixedImageX = (11 * 100) / 17;
                        fixedImageY = (13 * 140) / 19;
                    } else {
                        if (initialState.isIdentity) {
                            fixedImageX = 22;
                            fixedImageY = 26;
                        } else {
                            fixedImageX = 11;
                            fixedImageY = 13;
                        }
                    }

                    assert.deepStrictEqual(controller.dump(), {
                        isCenter: false,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: fixedImageX,
                        imageY: fixedImageY,
                        imageDisplayWidth: 100,
                        imageDisplayHeight: 140,
                        imageScale: 2,
                    });
                });
            }
        });

        describe("Auto fit layout", () => {
            describe("Identity", () => {
                const controllers = [
                    { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                    { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                    { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                    { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                ];

                for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                    it(name, () => {
                        const controller = new Controller(
                            200,
                            300,
                            50,
                            70,
                            new AutoLayout(true, savedIsCenter, new Size(17, 19)),
                            11,
                            13,
                            savedIsIdentity,
                            2,
                        );

                        const initialState = {
                            isCenter: true,
                            isIdentity: true,
                            scaleMode: ScaleMode.AutoFit,
                            imageX: 0,
                            imageY: 0,
                            imageDisplayWidth: 50,
                            imageDisplayHeight: 70,
                            imageScale: 1,
                        };

                        const altState = {
                            ...initialState,
                            isIdentity: false,
                            scaleMode: ScaleMode.Fit,
                            imageDisplayWidth: 200,
                            imageDisplayHeight: 280,
                            imageScale: 4,
                        };

                        const altState2 = {
                            isCenter: false,
                            isIdentity: false,
                            scaleMode: ScaleMode.Fixed,
                            imageX: (11 * 100) / 17,
                            imageY: (13 * 140) / 19,
                            imageDisplayWidth: 100,
                            imageDisplayHeight: 140,
                            imageScale: 2,
                        };

                        assert.deepStrictEqual(controller.dump(), initialState);
                        assert.deepStrictEqual(controller.switchToFitLayout(), altState);

                        controller.switchToFixedLayout();

                        if (savedIsCenter) {
                            controller.toggleIsCenter();
                        }

                        if (savedIsIdentity) {
                            controller.toggleIsIdentity();
                        }

                        assert.deepStrictEqual(controller.dump(), altState2);
                    });
                }
            });

            describe("Fit", () => {
                const controllers = [
                    { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                    { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                    { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                    { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                ];

                for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                    it(name, () => {
                        const controller = new Controller(
                            20,
                            30,
                            50,
                            70,
                            new AutoLayout(true, savedIsCenter, new Size(17, 19)),
                            11,
                            13,
                            savedIsIdentity,
                            2,
                        );

                        const initialState = {
                            isCenter: true,
                            isIdentity: false,
                            scaleMode: ScaleMode.AutoFit,
                            imageX: 0,
                            imageY: 0,
                            imageDisplayWidth: 20,
                            imageDisplayHeight: 28,
                            imageScale: 0.4,
                        };

                        const altState = { ...initialState, scaleMode: ScaleMode.Fit };

                        const altState2 = {
                            isCenter: false,
                            isIdentity: false,
                            scaleMode: ScaleMode.Fixed,
                            imageX: (11 * 100) / 17,
                            imageY: (13 * 140) / 19,
                            imageDisplayWidth: 100,
                            imageDisplayHeight: 140,
                            imageScale: 2,
                        };

                        assert.deepStrictEqual(controller.dump(), initialState);
                        assert.deepStrictEqual(controller.switchToFitLayout(), altState);

                        controller.switchToFixedLayout();

                        if (savedIsCenter) {
                            controller.toggleIsCenter();
                        }

                        if (savedIsIdentity) {
                            controller.toggleIsIdentity();
                        }

                        assert.deepStrictEqual(controller.dump(), altState2);
                    });
                }
            });
        });
    });

    describe("Switch to auto fit layout", () => {
        describe("Identity", () => {
            describe("Fixed layout", () => {
                const controllers = [
                    {
                        name: "Free",
                        controller: new Controller(200, 300, 50, 70, new FixedLayout(null), 11, 13, false, 2),
                        initialState: {
                            isCenter: false,
                            isIdentity: false,
                            scaleMode: ScaleMode.Fixed,
                            imageX: 11,
                            imageY: 13,
                            imageDisplayWidth: 100,
                            imageDisplayHeight: 140,
                            imageScale: 2,
                        },
                    },
                    {
                        name: "Center",
                        controller: new Controller(
                            200,
                            300,
                            50,
                            70,
                            new FixedLayout(new Size(17, 19)),
                            11,
                            13,
                            false,
                            2,
                        ),
                        initialState: {
                            isCenter: true,
                            isIdentity: false,
                            scaleMode: ScaleMode.Fixed,
                            imageX: 0,
                            imageY: 0,
                            imageDisplayWidth: 100,
                            imageDisplayHeight: 140,
                            imageScale: 2,
                        },
                    },
                    {
                        name: "Identity",
                        controller: new Controller(200, 300, 50, 70, new FixedLayout(null), 11, 13, true, 2),
                        initialState: {
                            isCenter: false,
                            isIdentity: true,
                            scaleMode: ScaleMode.Fixed,
                            imageX: 11,
                            imageY: 13,
                            imageDisplayWidth: 50,
                            imageDisplayHeight: 70,
                            imageScale: 1,
                        },
                    },
                    {
                        name: "Center identity",
                        controller: new Controller(
                            200,
                            300,
                            50,
                            70,
                            new FixedLayout(new Size(17, 19)),
                            11,
                            13,
                            true,
                            2,
                        ),
                        initialState: {
                            isCenter: true,
                            isIdentity: true,
                            scaleMode: ScaleMode.Fixed,
                            imageX: 0,
                            imageY: 0,
                            imageDisplayWidth: 50,
                            imageDisplayHeight: 70,
                            imageScale: 1,
                        },
                    },
                ];

                const altState = {
                    isCenter: true,
                    isIdentity: true,
                    scaleMode: ScaleMode.AutoFit,
                    imageX: 0,
                    imageY: 0,
                    imageDisplayWidth: 50,
                    imageDisplayHeight: 70,
                    imageScale: 1,
                };

                for (const { name, controller, initialState } of controllers) {
                    it(name, () => {
                        assert.deepStrictEqual(controller.dump(), initialState);
                        assert.deepStrictEqual(controller.switchToAutoFitLayout(), altState);
                        assert.deepStrictEqual(controller.switchToFixedLayout(), initialState);

                        if (initialState.isCenter) {
                            controller.toggleIsCenter();
                        }

                        if (initialState.isIdentity) {
                            controller.toggleIsIdentity();
                        }

                        let fixedImageX;
                        let fixedImageY;

                        if (initialState.isCenter) {
                            fixedImageX = (11 * 100) / 17;
                            fixedImageY = (13 * 140) / 19;
                        } else {
                            if (initialState.isIdentity) {
                                fixedImageX = 22;
                                fixedImageY = 26;
                            } else {
                                fixedImageX = 11;
                                fixedImageY = 13;
                            }
                        }

                        assert.deepStrictEqual(controller.dump(), {
                            isCenter: false,
                            isIdentity: false,
                            scaleMode: ScaleMode.Fixed,
                            imageX: fixedImageX,
                            imageY: fixedImageY,
                            imageDisplayWidth: 100,
                            imageDisplayHeight: 140,
                            imageScale: 2,
                        });
                    });
                }
            });

            describe("Fit layout", () => {
                const controllers = [
                    { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                    { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                    { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                    { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                ];

                for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                    it(name, () => {
                        const controller = new Controller(
                            200,
                            300,
                            50,
                            70,
                            new AutoLayout(false, savedIsCenter, new Size(17, 19)),
                            11,
                            13,
                            savedIsIdentity,
                            2,
                        );

                        const initialState = {
                            isCenter: true,
                            isIdentity: false,
                            scaleMode: ScaleMode.Fit,
                            imageX: 0,
                            imageY: 0,
                            imageDisplayWidth: 200,
                            imageDisplayHeight: 280,
                            imageScale: 4,
                        };

                        const altState = {
                            ...initialState,
                            isIdentity: true,
                            scaleMode: ScaleMode.AutoFit,
                            imageDisplayWidth: 50,
                            imageDisplayHeight: 70,
                            imageScale: 1,
                        };

                        const altState2 = {
                            isCenter: false,
                            isIdentity: false,
                            scaleMode: ScaleMode.Fixed,
                            imageX: (11 * 100) / 17,
                            imageY: (13 * 140) / 19,
                            imageDisplayWidth: 100,
                            imageDisplayHeight: 140,
                            imageScale: 2,
                        };

                        assert.deepStrictEqual(controller.dump(), initialState);
                        assert.deepStrictEqual(controller.switchToAutoFitLayout(), altState);

                        controller.switchToFixedLayout();

                        if (savedIsCenter) {
                            controller.toggleIsCenter();
                        }

                        if (savedIsIdentity) {
                            controller.toggleIsIdentity();
                        }

                        assert.deepStrictEqual(controller.dump(), altState2);
                    });
                }
            });
        });

        describe("Fit", () => {
            describe("Fixed layout", () => {
                const controllers = [
                    {
                        name: "Free",
                        controller: new Controller(20, 30, 50, 70, new FixedLayout(null), 11, 13, false, 2),
                        initialState: {
                            isCenter: false,
                            isIdentity: false,
                            scaleMode: ScaleMode.Fixed,
                            imageX: 11,
                            imageY: 13,
                            imageDisplayWidth: 100,
                            imageDisplayHeight: 140,
                            imageScale: 2,
                        },
                    },
                    {
                        name: "Center",
                        controller: new Controller(20, 30, 50, 70, new FixedLayout(new Size(17, 19)), 11, 13, false, 2),
                        initialState: {
                            isCenter: true,
                            isIdentity: false,
                            scaleMode: ScaleMode.Fixed,
                            imageX: 0,
                            imageY: 0,
                            imageDisplayWidth: 100,
                            imageDisplayHeight: 140,
                            imageScale: 2,
                        },
                    },
                    {
                        name: "Identity",
                        controller: new Controller(20, 30, 50, 70, new FixedLayout(null), 11, 13, true, 2),
                        initialState: {
                            isCenter: false,
                            isIdentity: true,
                            scaleMode: ScaleMode.Fixed,
                            imageX: 11,
                            imageY: 13,
                            imageDisplayWidth: 50,
                            imageDisplayHeight: 70,
                            imageScale: 1,
                        },
                    },
                    {
                        name: "Center identity",
                        controller: new Controller(20, 30, 50, 70, new FixedLayout(new Size(17, 19)), 11, 13, true, 2),
                        initialState: {
                            isCenter: true,
                            isIdentity: true,
                            scaleMode: ScaleMode.Fixed,
                            imageX: 0,
                            imageY: 0,
                            imageDisplayWidth: 50,
                            imageDisplayHeight: 70,
                            imageScale: 1,
                        },
                    },
                ];

                const altState = {
                    isCenter: true,
                    isIdentity: false,
                    scaleMode: ScaleMode.AutoFit,
                    imageX: 0,
                    imageY: 0,
                    imageDisplayWidth: 20,
                    imageDisplayHeight: 28,
                    imageScale: 0.4,
                };

                for (const { name, controller, initialState } of controllers) {
                    it(name, () => {
                        assert.deepStrictEqual(controller.dump(), initialState);
                        assert.deepStrictEqual(controller.switchToAutoFitLayout(), altState);
                        assert.deepStrictEqual(controller.switchToFixedLayout(), initialState);

                        if (initialState.isCenter) {
                            controller.toggleIsCenter();
                        }

                        if (initialState.isIdentity) {
                            controller.toggleIsIdentity();
                        }

                        let fixedImageX;
                        let fixedImageY;

                        if (initialState.isCenter) {
                            fixedImageX = (11 * 100) / 17;
                            fixedImageY = (13 * 140) / 19;
                        } else {
                            if (initialState.isIdentity) {
                                fixedImageX = 22;
                                fixedImageY = 26;
                            } else {
                                fixedImageX = 11;
                                fixedImageY = 13;
                            }
                        }

                        assert.deepStrictEqual(controller.dump(), {
                            isCenter: false,
                            isIdentity: false,
                            scaleMode: ScaleMode.Fixed,
                            imageX: fixedImageX,
                            imageY: fixedImageY,
                            imageDisplayWidth: 100,
                            imageDisplayHeight: 140,
                            imageScale: 2,
                        });
                    });
                }
            });

            describe("Fit layout", () => {
                const controllers = [
                    { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                    { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                    { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                    { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                ];

                for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                    it(name, () => {
                        const controller = new Controller(
                            20,
                            30,
                            50,
                            70,
                            new AutoLayout(false, savedIsCenter, new Size(17, 19)),
                            11,
                            13,
                            savedIsIdentity,
                            2,
                        );

                        const initialState = {
                            isCenter: true,
                            isIdentity: false,
                            scaleMode: ScaleMode.Fit,
                            imageX: 0,
                            imageY: 0,
                            imageDisplayWidth: 20,
                            imageDisplayHeight: 28,
                            imageScale: 0.4,
                        };

                        const altState = { ...initialState, scaleMode: ScaleMode.AutoFit };

                        const altState2 = {
                            isCenter: false,
                            isIdentity: false,
                            scaleMode: ScaleMode.Fixed,
                            imageX: (11 * 100) / 17,
                            imageY: (13 * 140) / 19,
                            imageDisplayWidth: 100,
                            imageDisplayHeight: 140,
                            imageScale: 2,
                        };

                        assert.deepStrictEqual(controller.dump(), initialState);
                        assert.deepStrictEqual(controller.switchToAutoFitLayout(), altState);

                        controller.switchToFixedLayout();

                        if (savedIsCenter) {
                            controller.toggleIsCenter();
                        }

                        if (savedIsIdentity) {
                            controller.toggleIsIdentity();
                        }

                        assert.deepStrictEqual(controller.dump(), altState2);
                    });
                }
            });
        });
    });

    describe("Start drag", () => {
        describe("Fixed layout", () => {
            const controllers = [
                {
                    name: "Free",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(null), 11, 13, false, 2),
                    initialState: {
                        isCenter: false,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 11,
                        imageY: 13,
                        imageDisplayWidth: 100,
                        imageDisplayHeight: 140,
                        imageScale: 2,
                    },
                },
                {
                    name: "Center",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(new Size(17, 19)), 11, 13, false, 2),
                    initialState: {
                        isCenter: true,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 100,
                        imageDisplayHeight: 140,
                        imageScale: 2,
                    },
                },
                {
                    name: "Identity",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(null), 11, 13, true, 2),
                    initialState: {
                        isCenter: false,
                        isIdentity: true,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 11,
                        imageY: 13,
                        imageDisplayWidth: 50,
                        imageDisplayHeight: 70,
                        imageScale: 1,
                    },
                },
                {
                    name: "Center identity",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(new Size(17, 19)), 11, 13, true, 2),
                    initialState: {
                        isCenter: true,
                        isIdentity: true,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 50,
                        imageDisplayHeight: 70,
                        imageScale: 1,
                    },
                },
            ];

            for (const { name, controller, initialState } of controllers) {
                it(name, () => {
                    assert.deepStrictEqual(controller.dump(), initialState);

                    const callback = controller.startDrag(10000, 20000);

                    assert.deepStrictEqual(controller.dump(), initialState);

                    assert.deepStrictEqual(callback(10200, 20300), {
                        ...initialState,
                        isCenter: false,
                        imageX: initialState.imageX + 200,
                        imageY: initialState.imageY + 300,
                    });

                    assert.deepStrictEqual(callback(10500, 20700), {
                        ...initialState,
                        isCenter: false,
                        imageX: initialState.imageX + 500,
                        imageY: initialState.imageY + 700,
                    });

                    if (initialState.isIdentity) {
                        controller.toggleIsIdentity();
                    }

                    assert.deepStrictEqual(controller.dump().imageScale, 2.0);
                });
            }
        });

        describe("Fit layout", () => {
            const controllers = [
                { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
            ];

            for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                it(name, () => {
                    const controller = new Controller(
                        20,
                        30,
                        50,
                        70,
                        new AutoLayout(false, savedIsCenter, new Size(17, 19)),
                        11,
                        13,
                        savedIsIdentity,
                        2,
                    );

                    const initialState = {
                        isCenter: true,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fit,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 20,
                        imageDisplayHeight: 28,
                        imageScale: 0.4,
                    };

                    const callback = controller.startDrag(10000, 20000);

                    assert.deepStrictEqual(controller.dump(), initialState);

                    assert.deepStrictEqual(callback(10200, 20300), {
                        ...initialState,
                        isCenter: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: initialState.imageX + 200,
                        imageY: initialState.imageY + 300,
                    });

                    assert.deepStrictEqual(callback(10500, 20700), {
                        ...initialState,
                        isCenter: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: initialState.imageX + 500,
                        imageY: initialState.imageY + 700,
                    });
                });
            }
        });

        describe("Auto fit layout", () => {
            describe("Identity", () => {
                const controllers = [
                    { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                    { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                    { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                    { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                ];

                for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                    it(name, () => {
                        const controller = new Controller(
                            200,
                            300,
                            50,
                            70,
                            new AutoLayout(true, savedIsCenter, new Size(17, 19)),
                            11,
                            13,
                            savedIsIdentity,
                            2,
                        );

                        const initialState = {
                            isCenter: true,
                            isIdentity: true,
                            scaleMode: ScaleMode.AutoFit,
                            imageX: 0,
                            imageY: 0,
                            imageDisplayWidth: 50,
                            imageDisplayHeight: 70,
                            imageScale: 1,
                        };

                        const callback = controller.startDrag(10000, 20000);

                        assert.deepStrictEqual(controller.dump(), initialState);

                        assert.deepStrictEqual(callback(10200, 20300), {
                            ...initialState,
                            isCenter: false,
                            scaleMode: ScaleMode.Fixed,
                            imageX: initialState.imageX + 200,
                            imageY: initialState.imageY + 300,
                        });

                        assert.deepStrictEqual(callback(10500, 20700), {
                            ...initialState,
                            isCenter: false,
                            scaleMode: ScaleMode.Fixed,
                            imageX: initialState.imageX + 500,
                            imageY: initialState.imageY + 700,
                        });
                    });
                }
            });

            describe("Fit", () => {
                const controllers = [
                    { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                    { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                    { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                    { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                ];

                for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                    it(name, () => {
                        const controller = new Controller(
                            20,
                            30,
                            50,
                            70,
                            new AutoLayout(true, savedIsCenter, new Size(17, 19)),
                            11,
                            13,
                            savedIsIdentity,
                            2,
                        );

                        const initialState = {
                            isCenter: true,
                            isIdentity: false,
                            scaleMode: ScaleMode.AutoFit,
                            imageX: 0,
                            imageY: 0,
                            imageDisplayWidth: 20,
                            imageDisplayHeight: 28,
                            imageScale: 0.4,
                        };

                        const callback = controller.startDrag(10000, 20000);

                        assert.deepStrictEqual(controller.dump(), initialState);

                        assert.deepStrictEqual(callback(10200, 20300), {
                            ...initialState,
                            isCenter: false,
                            scaleMode: ScaleMode.Fixed,
                            imageX: initialState.imageX + 200,
                            imageY: initialState.imageY + 300,
                        });

                        assert.deepStrictEqual(callback(10500, 20700), {
                            ...initialState,
                            isCenter: false,
                            scaleMode: ScaleMode.Fixed,
                            imageX: initialState.imageX + 500,
                            imageY: initialState.imageY + 700,
                        });
                    });
                }
            });
        });
    });

    describe("Toggle is identity at", () => {
        describe("Fixed layout", () => {
            const controllers = [
                {
                    name: "Free",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(null), 11, 13, false, 2),
                    initialState: {
                        isCenter: false,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 11,
                        imageY: 13,
                        imageDisplayWidth: 100,
                        imageDisplayHeight: 140,
                        imageScale: 2,
                    },
                },
                {
                    name: "Center",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(new Size(17, 19)), 11, 13, false, 2),
                    initialState: {
                        isCenter: true,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 100,
                        imageDisplayHeight: 140,
                        imageScale: 2,
                    },
                },
                {
                    name: "Identity",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(null), 11, 13, true, 2),
                    initialState: {
                        isCenter: false,
                        isIdentity: true,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 11,
                        imageY: 13,
                        imageDisplayWidth: 50,
                        imageDisplayHeight: 70,
                        imageScale: 1,
                    },
                },
                {
                    name: "Center identity",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(new Size(17, 19)), 11, 13, true, 2),
                    initialState: {
                        isCenter: true,
                        isIdentity: true,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 50,
                        imageDisplayHeight: 70,
                        imageScale: 1,
                    },
                },
            ];

            for (const { name, controller, initialState } of controllers) {
                it(name, () => {
                    assert.deepStrictEqual(controller.dump(), initialState);

                    const anchorX = initialState.imageX + initialState.imageDisplayWidth / 2;
                    const anchorY = initialState.imageY + initialState.imageDisplayHeight / 2;

                    const expectedScale = initialState.isIdentity ? 2 : 1;
                    const expectedImageDisplayWidth = 50 * expectedScale;
                    const expectedImageDisplayHeight = 70 * expectedScale;

                    const altState = {
                        ...initialState,
                        isCenter: false,
                        isIdentity: !initialState.isIdentity,
                        imageX: anchorX - expectedImageDisplayWidth / 2,
                        imageY: anchorY - expectedImageDisplayHeight / 2,
                        imageDisplayWidth: expectedImageDisplayWidth,
                        imageDisplayHeight: expectedImageDisplayHeight,
                        imageScale: expectedScale,
                    };

                    assert.deepStrictEqual(controller.toggleIsIdentityAt(anchorX, anchorY), altState);

                    assert.deepStrictEqual(controller.toggleIsIdentityAt(anchorX, anchorY), {
                        ...initialState,
                        isCenter: false,
                    });

                    assert.deepStrictEqual(controller.toggleIsIdentityAt(anchorX, anchorY), altState);

                    assert.deepStrictEqual(controller.toggleIsIdentityAt(anchorX, anchorY), {
                        ...initialState,
                        isCenter: false,
                    });
                });
            }
        });

        describe("Fit layout", () => {
            const controllers = [
                { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
            ];

            for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                it(name, () => {
                    const controller = new Controller(
                        20,
                        30,
                        50,
                        70,
                        new AutoLayout(false, savedIsCenter, new Size(17, 19)),
                        11,
                        13,
                        savedIsIdentity,
                        2,
                    );

                    const initialState = {
                        isCenter: true,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fit,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 20,
                        imageDisplayHeight: 28,
                        imageScale: 0.4,
                    };

                    const altState = {
                        isCenter: false,
                        isIdentity: true,
                        scaleMode: ScaleMode.Fixed,
                        imageX: -15,
                        imageY: -21,
                        imageDisplayWidth: 50,
                        imageDisplayHeight: 70,
                        imageScale: 1,
                    };

                    assert.deepStrictEqual(controller.toggleIsIdentityAt(10, 14), altState);

                    assert.deepStrictEqual(controller.toggleIsIdentityAt(10, 14), {
                        ...initialState,
                        isCenter: false,
                        scaleMode: ScaleMode.Fixed,
                    });

                    assert.deepStrictEqual(controller.toggleIsIdentityAt(10, 14), altState);

                    assert.deepStrictEqual(controller.toggleIsIdentityAt(10, 14), {
                        ...initialState,
                        isCenter: false,
                        scaleMode: ScaleMode.Fixed,
                    });
                });
            }
        });

        describe("Auto fit layout", () => {
            describe("Identity", () => {
                const controllers = [
                    { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                    { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                    { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                    { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                ];

                for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                    it(name, () => {
                        const controller = new Controller(
                            200,
                            300,
                            50,
                            70,
                            new AutoLayout(true, savedIsCenter, new Size(17, 19)),
                            11,
                            13,
                            savedIsIdentity,
                            2,
                        );

                        const initialState = {
                            isCenter: true,
                            isIdentity: true,
                            scaleMode: ScaleMode.AutoFit,
                            imageX: 0,
                            imageY: 0,
                            imageDisplayWidth: 50,
                            imageDisplayHeight: 70,
                            imageScale: 1,
                        };

                        const altState = {
                            isCenter: false,
                            isIdentity: false,
                            scaleMode: ScaleMode.Fixed,
                            imageX: -25,
                            imageY: -35,
                            imageDisplayWidth: 100,
                            imageDisplayHeight: 140,
                            imageScale: 2,
                        };

                        assert.deepStrictEqual(controller.toggleIsIdentityAt(25, 35), altState);

                        assert.deepStrictEqual(controller.toggleIsIdentityAt(25, 35), {
                            ...initialState,
                            isCenter: false,
                            scaleMode: ScaleMode.Fixed,
                        });

                        assert.deepStrictEqual(controller.toggleIsIdentityAt(25, 35), altState);

                        assert.deepStrictEqual(controller.toggleIsIdentityAt(25, 35), {
                            ...initialState,
                            isCenter: false,
                            scaleMode: ScaleMode.Fixed,
                        });
                    });
                }
            });

            describe("Fit", () => {
                const controllers = [
                    { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                    { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                    { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                    { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                ];

                for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                    it(name, () => {
                        const controller = new Controller(
                            20,
                            30,
                            50,
                            70,
                            new AutoLayout(true, savedIsCenter, new Size(17, 19)),
                            11,
                            13,
                            savedIsIdentity,
                            2,
                        );

                        const initialState = {
                            isCenter: true,
                            isIdentity: false,
                            scaleMode: ScaleMode.AutoFit,
                            imageX: 0,
                            imageY: 0,
                            imageDisplayWidth: 20,
                            imageDisplayHeight: 28,
                            imageScale: 0.4,
                        };

                        const altState = {
                            isCenter: false,
                            isIdentity: true,
                            scaleMode: ScaleMode.Fixed,
                            imageX: -15,
                            imageY: -21,
                            imageDisplayWidth: 50,
                            imageDisplayHeight: 70,
                            imageScale: 1,
                        };

                        assert.deepStrictEqual(controller.toggleIsIdentityAt(10, 14), altState);

                        assert.deepStrictEqual(controller.toggleIsIdentityAt(10, 14), {
                            ...initialState,
                            isCenter: false,
                            scaleMode: ScaleMode.Fixed,
                        });

                        assert.deepStrictEqual(controller.toggleIsIdentityAt(10, 14), altState);

                        assert.deepStrictEqual(controller.toggleIsIdentityAt(10, 14), {
                            ...initialState,
                            isCenter: false,
                            scaleMode: ScaleMode.Fixed,
                        });
                    });
                }
            });
        });
    });

    describe("Set scale", () => {
        describe("Fixed layout", () => {
            const controllers = [
                {
                    name: "Free",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(null), 11, 13, false, 2),
                    initialState: {
                        isCenter: false,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 11,
                        imageY: 13,
                        imageDisplayWidth: 100,
                        imageDisplayHeight: 140,
                        imageScale: 2,
                    },
                },
                {
                    name: "Center",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(new Size(17, 19)), 11, 13, false, 2),
                    initialState: {
                        isCenter: true,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 100,
                        imageDisplayHeight: 140,
                        imageScale: 2,
                    },
                },
                {
                    name: "Identity",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(null), 11, 13, true, 2),
                    initialState: {
                        isCenter: false,
                        isIdentity: true,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 11,
                        imageY: 13,
                        imageDisplayWidth: 50,
                        imageDisplayHeight: 70,
                        imageScale: 1,
                    },
                },
                {
                    name: "Center identity",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(new Size(17, 19)), 11, 13, true, 2),
                    initialState: {
                        isCenter: true,
                        isIdentity: true,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 50,
                        imageDisplayHeight: 70,
                        imageScale: 1,
                    },
                },
            ];

            for (const { name, controller, initialState } of controllers) {
                it(name, () => {
                    assert.deepStrictEqual(controller.dump(), initialState);

                    const expectedScale = 3;
                    const expectedImageDisplayWidth = 50 * expectedScale;
                    const expectedImageDisplayHeight = 70 * expectedScale;

                    const altState = {
                        ...initialState,
                        isIdentity: false,
                        imageX: initialState.imageX * (expectedScale / initialState.imageScale),
                        imageY: initialState.imageY * (expectedScale / initialState.imageScale),
                        imageDisplayWidth: expectedImageDisplayWidth,
                        imageDisplayHeight: expectedImageDisplayHeight,
                        imageScale: expectedScale,
                    };

                    assert.deepStrictEqual(controller.setScale(expectedScale), altState);

                    assert.deepStrictEqual(controller.setScale(initialState.imageScale), {
                        ...initialState,
                        isIdentity: false,
                    });

                    assert.deepStrictEqual(controller.setScale(expectedScale), altState);

                    assert.deepStrictEqual(controller.setScale(initialState.imageScale), {
                        ...initialState,
                        isIdentity: false,
                    });
                });
            }
        });

        describe("Fit layout", () => {
            const controllers = [
                { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
            ];

            for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                it(name, () => {
                    const controller = new Controller(
                        20,
                        30,
                        50,
                        70,
                        new AutoLayout(false, savedIsCenter, new Size(17, 19)),
                        11,
                        13,
                        savedIsIdentity,
                        2,
                    );

                    const initialState = {
                        isCenter: true,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fit,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 20,
                        imageDisplayHeight: 28,
                        imageScale: 0.4,
                    };

                    const altState = {
                        ...initialState,
                        scaleMode: ScaleMode.Fixed,
                        imageDisplayWidth: 150,
                        imageDisplayHeight: 210,
                        imageScale: 3,
                    };

                    assert.deepStrictEqual(controller.setScale(3), altState);

                    assert.deepStrictEqual(controller.setScale(0.4), {
                        ...initialState,
                        scaleMode: ScaleMode.Fixed,
                    });

                    assert.deepStrictEqual(controller.setScale(3), altState);

                    assert.deepStrictEqual(controller.setScale(0.4), {
                        ...initialState,
                        scaleMode: ScaleMode.Fixed,
                    });
                });
            }
        });

        describe("Auto fit layout", () => {
            describe("Identity", () => {
                const controllers = [
                    { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                    { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                    { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                    { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                ];

                for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                    it(name, () => {
                        const controller = new Controller(
                            200,
                            300,
                            50,
                            70,
                            new AutoLayout(true, savedIsCenter, new Size(17, 19)),
                            11,
                            13,
                            savedIsIdentity,
                            2,
                        );

                        const initialState = {
                            isCenter: true,
                            isIdentity: true,
                            scaleMode: ScaleMode.AutoFit,
                            imageX: 0,
                            imageY: 0,
                            imageDisplayWidth: 50,
                            imageDisplayHeight: 70,
                            imageScale: 1,
                        };

                        const altState = {
                            ...initialState,
                            isIdentity: false,
                            scaleMode: ScaleMode.Fixed,
                            imageDisplayWidth: 150,
                            imageDisplayHeight: 210,
                            imageScale: 3,
                        };

                        assert.deepStrictEqual(controller.setScale(3), altState);

                        assert.deepStrictEqual(controller.setScale(1), {
                            ...initialState,
                            isIdentity: false,
                            scaleMode: ScaleMode.Fixed,
                        });

                        assert.deepStrictEqual(controller.setScale(3), altState);

                        assert.deepStrictEqual(controller.setScale(1), {
                            ...initialState,
                            isIdentity: false,
                            scaleMode: ScaleMode.Fixed,
                        });
                    });
                }
            });

            describe("Fit", () => {
                const controllers = [
                    { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                    { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                    { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                    { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                ];

                for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                    it(name, () => {
                        const controller = new Controller(
                            20,
                            30,
                            50,
                            70,
                            new AutoLayout(true, savedIsCenter, new Size(17, 19)),
                            11,
                            13,
                            savedIsIdentity,
                            2,
                        );

                        const initialState = {
                            isCenter: true,
                            isIdentity: false,
                            scaleMode: ScaleMode.AutoFit,
                            imageX: 0,
                            imageY: 0,
                            imageDisplayWidth: 20,
                            imageDisplayHeight: 28,
                            imageScale: 0.4,
                        };

                        const altState = {
                            ...initialState,
                            scaleMode: ScaleMode.Fixed,
                            imageDisplayWidth: 150,
                            imageDisplayHeight: 210,
                            imageScale: 3,
                        };

                        assert.deepStrictEqual(controller.setScale(3), altState);

                        assert.deepStrictEqual(controller.setScale(0.4), {
                            ...initialState,
                            scaleMode: ScaleMode.Fixed,
                        });

                        assert.deepStrictEqual(controller.setScale(3), altState);

                        assert.deepStrictEqual(controller.setScale(0.4), {
                            ...initialState,
                            scaleMode: ScaleMode.Fixed,
                        });
                    });
                }
            });
        });
    });

    describe("Set scale at", () => {
        describe("Fixed layout", () => {
            const controllers = [
                {
                    name: "Free",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(null), 11, 13, false, 2),
                    initialState: {
                        isCenter: false,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 11,
                        imageY: 13,
                        imageDisplayWidth: 100,
                        imageDisplayHeight: 140,
                        imageScale: 2,
                    },
                },
                {
                    name: "Center",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(new Size(17, 19)), 11, 13, false, 2),
                    initialState: {
                        isCenter: true,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 100,
                        imageDisplayHeight: 140,
                        imageScale: 2,
                    },
                },
                {
                    name: "Identity",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(null), 11, 13, true, 2),
                    initialState: {
                        isCenter: false,
                        isIdentity: true,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 11,
                        imageY: 13,
                        imageDisplayWidth: 50,
                        imageDisplayHeight: 70,
                        imageScale: 1,
                    },
                },
                {
                    name: "Center identity",
                    controller: new Controller(20, 30, 50, 70, new FixedLayout(new Size(17, 19)), 11, 13, true, 2),
                    initialState: {
                        isCenter: true,
                        isIdentity: true,
                        scaleMode: ScaleMode.Fixed,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 50,
                        imageDisplayHeight: 70,
                        imageScale: 1,
                    },
                },
            ];

            for (const { name, controller, initialState } of controllers) {
                it(name, () => {
                    assert.deepStrictEqual(controller.dump(), initialState);

                    const anchorX = initialState.imageX + initialState.imageDisplayWidth / 2;
                    const anchorY = initialState.imageY + initialState.imageDisplayHeight / 2;

                    const expectedScale = 3;
                    const expectedImageDisplayWidth = 50 * expectedScale;
                    const expectedImageDisplayHeight = 70 * expectedScale;

                    const altState = {
                        ...initialState,
                        isCenter: false,
                        isIdentity: false,
                        imageX: anchorX - expectedImageDisplayWidth / 2,
                        imageY: anchorY - expectedImageDisplayHeight / 2,
                        imageDisplayWidth: expectedImageDisplayWidth,
                        imageDisplayHeight: expectedImageDisplayHeight,
                        imageScale: expectedScale,
                    };

                    assert.deepStrictEqual(controller.setScaleAt(anchorX, anchorY, expectedScale), altState);

                    assert.deepStrictEqual(controller.setScaleAt(anchorX, anchorY, initialState.imageScale), {
                        ...initialState,
                        isCenter: false,
                        isIdentity: false,
                    });

                    assert.deepStrictEqual(controller.setScaleAt(anchorX, anchorY, expectedScale), altState);

                    assert.deepStrictEqual(controller.setScaleAt(anchorX, anchorY, initialState.imageScale), {
                        ...initialState,
                        isCenter: false,
                        isIdentity: false,
                    });
                });
            }
        });

        describe("Fit layout", () => {
            const controllers = [
                { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
            ];

            for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                it(name, () => {
                    const controller = new Controller(
                        20,
                        30,
                        50,
                        70,
                        new AutoLayout(false, savedIsCenter, new Size(17, 19)),
                        11,
                        13,
                        savedIsIdentity,
                        2,
                    );

                    const initialState = {
                        isCenter: true,
                        isIdentity: false,
                        scaleMode: ScaleMode.Fit,
                        imageX: 0,
                        imageY: 0,
                        imageDisplayWidth: 20,
                        imageDisplayHeight: 28,
                        imageScale: 0.4,
                    };

                    const altState = {
                        ...initialState,
                        isCenter: false,
                        scaleMode: ScaleMode.Fixed,
                        imageX: -65,
                        imageY: -91,
                        imageDisplayWidth: 150,
                        imageDisplayHeight: 210,
                        imageScale: 3,
                    };

                    assert.deepStrictEqual(controller.setScaleAt(10, 14, 3), altState);

                    assert.deepStrictEqual(controller.setScaleAt(10, 14, 0.4), {
                        ...initialState,
                        isCenter: false,
                        scaleMode: ScaleMode.Fixed,
                    });

                    assert.deepStrictEqual(controller.setScaleAt(10, 14, 3), altState);

                    assert.deepStrictEqual(controller.setScaleAt(10, 14, 0.4), {
                        ...initialState,
                        isCenter: false,
                        scaleMode: ScaleMode.Fixed,
                    });
                });
            }
        });

        describe("Auto fit layout", () => {
            describe("Identity", () => {
                const controllers = [
                    { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                    { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                    { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                    { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                ];

                for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                    it(name, () => {
                        const controller = new Controller(
                            200,
                            300,
                            50,
                            70,
                            new AutoLayout(true, savedIsCenter, new Size(17, 19)),
                            11,
                            13,
                            savedIsIdentity,
                            2,
                        );

                        const initialState = {
                            isCenter: true,
                            isIdentity: true,
                            scaleMode: ScaleMode.AutoFit,
                            imageX: 0,
                            imageY: 0,
                            imageDisplayWidth: 50,
                            imageDisplayHeight: 70,
                            imageScale: 1,
                        };

                        const altState = {
                            isCenter: false,
                            isIdentity: false,
                            scaleMode: ScaleMode.Fixed,
                            imageX: -50,
                            imageY: -70,
                            imageDisplayWidth: 150,
                            imageDisplayHeight: 210,
                            imageScale: 3,
                        };

                        assert.deepStrictEqual(controller.setScaleAt(25, 35, 3), altState);

                        assert.deepStrictEqual(controller.setScaleAt(25, 35, 1), {
                            ...initialState,
                            isCenter: false,
                            isIdentity: false,
                            scaleMode: ScaleMode.Fixed,
                        });

                        assert.deepStrictEqual(controller.setScaleAt(25, 35, 3), altState);

                        assert.deepStrictEqual(controller.setScaleAt(25, 35, 1), {
                            ...initialState,
                            isCenter: false,
                            isIdentity: false,
                            scaleMode: ScaleMode.Fixed,
                        });
                    });
                }
            });

            describe("Fit", () => {
                const controllers = [
                    { name: "Free", savedIsCenter: false, savedIsIdentity: false },
                    { name: "Identity", savedIsCenter: false, savedIsIdentity: true },
                    { name: "Center", savedIsCenter: true, savedIsIdentity: false },
                    { name: "Center identity", savedIsCenter: true, savedIsIdentity: true },
                ];

                for (const { name, savedIsCenter, savedIsIdentity } of controllers) {
                    it(name, () => {
                        const controller = new Controller(
                            20,
                            30,
                            50,
                            70,
                            new AutoLayout(true, savedIsCenter, new Size(17, 19)),
                            11,
                            13,
                            savedIsIdentity,
                            2,
                        );

                        const initialState = {
                            isCenter: true,
                            isIdentity: false,
                            scaleMode: ScaleMode.AutoFit,
                            imageX: 0,
                            imageY: 0,
                            imageDisplayWidth: 20,
                            imageDisplayHeight: 28,
                            imageScale: 0.4,
                        };

                        const altState = {
                            isCenter: false,
                            isIdentity: false,
                            scaleMode: ScaleMode.Fixed,
                            imageX: -65,
                            imageY: -91,
                            imageDisplayWidth: 150,
                            imageDisplayHeight: 210,
                            imageScale: 3,
                        };

                        assert.deepStrictEqual(controller.setScaleAt(10, 14, 3), altState);

                        assert.deepStrictEqual(controller.setScaleAt(10, 14, 0.4), {
                            ...initialState,
                            isCenter: false,
                            scaleMode: ScaleMode.Fixed,
                        });

                        assert.deepStrictEqual(controller.setScaleAt(10, 14, 3), altState);

                        assert.deepStrictEqual(controller.setScaleAt(10, 14, 0.4), {
                            ...initialState,
                            isCenter: false,
                            scaleMode: ScaleMode.Fixed,
                        });
                    });
                }
            });
        });
    });
});
