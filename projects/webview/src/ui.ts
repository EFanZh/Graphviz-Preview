import { type Controller } from "./controller";
import { type ParsedImage } from "./images";
import { ScaleMode } from "./layout-view";
import { Size } from "./layout";
import { type UiView } from "./ui-view";

const workspacePadding = 32;

function getMousePosition(element: Element, event: MouseEvent) {
    const { x, y } = element.getBoundingClientRect();

    return {
        x: event.x - x,
        y: event.y - y,
    };
}

export class Ui implements UiView {
    public constructor(
        private readonly window: Window,
        private readonly headElement: HTMLHeadElement,
        private readonly styleSheetElements: HTMLLinkElement[],
        private readonly previousPageButton: HTMLButtonElement,
        private readonly nextPageButton: HTMLButtonElement,
        private readonly pageStatusElement: HTMLElement,
        private readonly scaleStatusElement: HTMLElement,
        private readonly isCenterCheckBox: HTMLInputElement,
        private readonly isIdentityCheckBox: HTMLInputElement,
        private readonly scaleModeFixedRadioButton: HTMLInputElement,
        private readonly scaleModeFitRadioButton: HTMLInputElement,
        private readonly scaleModeAutoFitRadioButton: HTMLInputElement,
        private readonly exportButton: HTMLButtonElement,
        private readonly workspaceElement: HTMLElement,
        private readonly imageElement: HTMLElement,
        private readonly previewStatusElement: HTMLElement,
    ) {}

    public initialize() {
        this.workspaceElement.tabIndex = 1;
    }

    public setupEventHandlers(controller: Controller) {
        // Window.

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        this.window.addEventListener("message", (ev) => controller.receiveMessage(ev.data));

        // Page switching buttons.

        this.previousPageButton.addEventListener("click", controller.previousImage.bind(controller));
        this.nextPageButton.addEventListener("click", controller.nextImage.bind(controller));

        // Checkboxes.

        this.isCenterCheckBox.addEventListener("change", controller.toggleIsCenter.bind(controller));
        this.isIdentityCheckBox.addEventListener("change", controller.toggleIsIdentity.bind(controller));

        // Scale mode radio buttons.

        function setScaleModeListener(radioButton: HTMLInputElement, scaleMode: ScaleMode) {
            radioButton.addEventListener("change", () => {
                if (radioButton.checked) {
                    controller.setScaleMode(scaleMode);
                }
            });
        }

        setScaleModeListener(this.scaleModeFixedRadioButton, ScaleMode.Fixed);
        setScaleModeListener(this.scaleModeFitRadioButton, ScaleMode.Fit);
        setScaleModeListener(this.scaleModeAutoFitRadioButton, ScaleMode.AutoFit);

        // Export button.

        this.exportButton.addEventListener("click", controller.onExportImageCommand.bind(controller));

        // Workspace element.

        const workspaceElement = this.workspaceElement;

        new ResizeObserver(() =>
            controller.onViewSizeChanged(
                workspaceElement.clientWidth - workspacePadding,
                workspaceElement.clientHeight - workspacePadding,
            ),
        ).observe(workspaceElement);

        workspaceElement.addEventListener("click", function (ev) {
            if (ev.detail % 2 === 0) {
                const { x, y } = getMousePosition(this, ev);

                controller.toggleIsIdentityAt(x - this.clientWidth / 2, y - this.clientHeight / 2);
            }
        });

        workspaceElement.addEventListener("keydown", (ev) => {
            switch (ev.key) {
                // Change graph.

                case "P":
                case "p":
                    controller.previousImage();

                    break;

                case "N":
                case "n":
                    controller.nextImage();

                    break;

                // Toggle is center.

                case " ":
                case "X":
                case "x":
                    this.isCenterCheckBox.checked = !this.isCenterCheckBox.checked;
                    controller.toggleIsCenter();

                    break;

                // Zoom out.

                case "_":
                case "-":
                    controller.zoomOut();

                    break;

                // Zoom in.

                case "+":
                case "=":
                    controller.zoomIn();

                    break;

                // Toggle is identity.

                case "0":
                    this.isIdentityCheckBox.checked = !this.isIdentityCheckBox.checked;
                    controller.toggleIsIdentity();

                    break;

                // Scroll.

                case "A":
                case "ArrowLeft":
                case "a":
                    controller.moveRight();

                    break;

                case "ArrowDown":
                case "S":
                case "s":
                    controller.moveUp();

                    break;

                case "ArrowRight":
                case "D":
                case "d":
                    controller.moveLeft();

                    break;

                case "ArrowUp":
                case "W":
                case "w":
                    controller.moveDown();

                    break;
            }
        });

        workspaceElement.addEventListener("pointerdown", function (ev) {
            // Skip hyper links.

            let target = ev.target;

            while (target instanceof Element) {
                if (target instanceof SVGAElement || target instanceof HTMLAnchorElement) {
                    return;
                }

                target = target.parentElement;
            }

            // Drag events.

            if (ev.button === 0) {
                const startPosition = getMousePosition(this, ev);
                const innerMoveHandler = controller.startDrag(startPosition.x, startPosition.y);

                if (innerMoveHandler !== undefined) {
                    const pointerMoveHandler = (ev: MouseEvent) => {
                        const { x, y } = getMousePosition(this, ev);

                        innerMoveHandler(x, y);
                    };

                    function pointerUpHandler(this: HTMLElement) {
                        this.removeEventListener("pointermove", pointerMoveHandler);
                        this.removeEventListener("lostpointercapture", pointerUpHandler);
                    }

                    this.addEventListener("pointermove", pointerMoveHandler);
                    this.addEventListener("lostpointercapture", pointerUpHandler);

                    this.setPointerCapture(ev.pointerId);
                }
            }
        });

        workspaceElement.addEventListener(
            "wheel",
            function (ev) {
                let { x, y } = getMousePosition(this, ev);

                x -= this.clientWidth / 2;
                y -= this.clientHeight / 2;

                if (ev.deltaY < 0) {
                    controller.zoomInAt(x, y);
                } else {
                    controller.zoomOutAt(x, y);
                }
            },
            {
                passive: true,
            },
        );
    }

    // =========================================== Layout view interface ============================================ //

    public setIsCenter(value: boolean): void {
        this.isCenterCheckBox.checked = value;
    }

    public setIsIdentity(value: boolean): void {
        this.isIdentityCheckBox.checked = value;
    }

    public setScaleMode(value: ScaleMode): void {
        let radioButton;

        switch (value) {
            case ScaleMode.Fixed:
                radioButton = this.scaleModeFixedRadioButton;

                break;
            case ScaleMode.Fit:
                radioButton = this.scaleModeFitRadioButton;

                break;
            case ScaleMode.AutoFit:
                radioButton = this.scaleModeAutoFitRadioButton;

                break;
        }

        radioButton.checked = true;
    }

    public setImagePosition(x: number, y: number): void {
        this.imageElement.style.left = x + "px";
        this.imageElement.style.top = y + "px";
    }

    public setImageDisplaySize(width: number, height: number): void {
        this.imageElement.style.width = width + "px";
        this.imageElement.style.height = height + "px";
    }

    public setImageScale(scale: number): void {
        this.scaleStatusElement.innerText = `${(scale * 100).toFixed(2)} %`;
    }

    // ============================================= UI view interface ============================================== //

    public getViewSize(): Size {
        return new Size(
            this.workspaceElement.clientWidth - workspacePadding,
            this.workspaceElement.clientHeight - workspacePadding,
        );
    }

    public setImage(currentPage: number, totalPages: number, image: ParsedImage): void {
        function needToUpdateStyleSheets(
            oldElements: readonly HTMLLinkElement[],
            newElements: readonly HTMLLinkElement[],
        ): boolean {
            let i = 0;

            for (;;) {
                const lhs = oldElements[i];
                const rhs = newElements[i];

                if (lhs === undefined) {
                    return rhs !== undefined;
                }

                if (rhs === undefined || lhs.outerHTML !== rhs.outerHTML) {
                    return true;
                }

                i++;
            }
        }

        this.previousPageButton.disabled = currentPage < 2;
        this.nextPageButton.disabled = currentPage >= totalPages;
        this.pageStatusElement.innerText = `${currentPage} / ${totalPages}`;
        this.exportButton.disabled = totalPages !== 1;

        // Replace style sheets.

        const newStyleSheetElements = image.styleSheetElements;

        if (needToUpdateStyleSheets(this.styleSheetElements, newStyleSheetElements)) {
            for (const element of this.styleSheetElements.splice(
                0,
                this.styleSheetElements.length,
                ...newStyleSheetElements,
            )) {
                element.remove();
            }

            this.headElement.append(...this.styleSheetElements);
        }

        // Replace image.

        this.imageElement.replaceChildren(image.asNode());

        if (this.workspaceElement.tabIndex <= 0) {
            this.workspaceElement.tabIndex = 1;
            this.isCenterCheckBox.disabled = false;
            this.isIdentityCheckBox.disabled = false;
            this.scaleModeFixedRadioButton.disabled = false;
            this.scaleModeFitRadioButton.disabled = false;
            this.scaleModeAutoFitRadioButton.disabled = false;
            this.previewStatusElement.innerText = "";
        }
    }

    public setPreviewStatus(status: string): void {
        if (this.workspaceElement.tabIndex > 0) {
            this.workspaceElement.tabIndex = 0;
            this.previousPageButton.disabled = true;
            this.nextPageButton.disabled = true;
            this.isCenterCheckBox.disabled = true;
            this.isIdentityCheckBox.disabled = true;
            this.scaleModeFixedRadioButton.disabled = true;
            this.scaleModeFitRadioButton.disabled = true;
            this.scaleModeAutoFitRadioButton.disabled = true;
            this.exportButton.disabled = true;
        }

        this.previewStatusElement.innerText = status;
    }
}
