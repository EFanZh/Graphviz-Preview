import { PreviewMessage } from "../extension";
import * as controller from "./controller";

document.addEventListener(
    "DOMContentLoaded",
    () => {
        const zoomElement = document.getElementById("zoom")!;
        const identityElement = document.getElementById("identity")!;
        const centerElement = document.getElementById("center")!;

        const zoomModeFixedElement =
            document.querySelector('input[name="zoom-mode"][value="fixed"]')! as HTMLInputElement;

        const zoomModeFitElement =
            document.querySelector('input[name="zoom-mode"][value="fit"]')! as HTMLInputElement;

        const zoomModeAutoFitElement =
            document.querySelector('input[name="zoom-mode"][value="auto-fit"]')! as HTMLInputElement;

        const exportElement = document.getElementById("export")!;
        const workspaceElement = document.getElementById("workspace")!;
        const imageElement = document.getElementById("image")! as HTMLImageElement;
        const statusElement = document.getElementById("status")!;

        class ControllerEventListener implements controller.IViewEventListener {
            public onZoomModeChanged(zoomMode: controller.ZoomMode): void {
                switch (zoomMode) {
                    case controller.ZoomMode.Fixed:
                        zoomModeFixedElement.checked = true;
                        break;
                    case controller.ZoomMode.Fit:
                        zoomModeFitElement.checked = true;
                        break;
                    case controller.ZoomMode.AutoFit:
                        zoomModeAutoFitElement.checked = true;
                        break;
                }
            }

            public onLayoutChanged(x: number, y: number, zoom: number): void {
                zoomElement.textContent = `${Math.round(zoom * 10000) / 100} %`;
                imageElement.style.left = `${x}px`;
                imageElement.style.top = `${y}px`;
                imageElement.style.width = `${imageElement.naturalWidth * zoom}px`;
            }
        }

        const theController = new controller.Controller(
            workspaceElement.offsetWidth,
            workspaceElement.offsetHeight,
            imageElement.naturalWidth,
            imageElement.naturalHeight,
            10,
            new ControllerEventListener(),
            1.1,
            controller.ZoomMode.AutoFit
        );

        // Window events.

        function setImage(image: string): void {
            imageElement.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(image)}`;
        }

        function setStatus(status: string): void {
            statusElement.textContent = status;
        }

        function clearStatus(): void {
            statusElement.textContent = null;
        }

        window.onmessage = (ev) => {
            const message = ev.data as PreviewMessage;

            if (message.type === "success") {
                setImage(message.image);
                clearStatus();
            } else {
                setStatus(message.message);
            }
        };

        window.onresize = () => theController.resize(workspaceElement.offsetWidth, workspaceElement.offsetHeight);

        // Identity element.

        identityElement.onclick = () => theController.makeIdentity();

        // Center element.

        centerElement.onclick = () => theController.makeCenter();

        // Zoom mode elements.

        function updateZoomMode(this: HTMLElement): void {
            const checkedElement = this as HTMLInputElement;

            if (checkedElement.checked) {
                switch (checkedElement.value) {
                    case "fixed":
                        theController.setZoomMode(controller.ZoomMode.Fixed);
                        break;
                    case "fit":
                        theController.setZoomMode(controller.ZoomMode.Fit);
                        break;
                    case "auto-fit":
                        theController.setZoomMode(controller.ZoomMode.AutoFit);
                        break;
                }
            }
        }

        zoomModeFixedElement.onchange = updateZoomMode;
        zoomModeFitElement.onchange = updateZoomMode;
        zoomModeAutoFitElement.onchange = updateZoomMode;

        // Export element.

        exportElement.onclick = () => {
            //
        };

        // Workspace element.

        workspaceElement.ondblclick = (ev) => {
            theController.toggleOverview(ev.offsetX, ev.offsetY);
        };

        workspaceElement.onmousewheel = (ev) => {
            if (ev.deltaY < 0) {
                theController.zoomIn(ev.offsetX, ev.offsetY);
            } else {
                theController.zoomOut(ev.offsetX, ev.offsetY);
            }
        };

        workspaceElement.onpointerdown = (ev) => {
            workspaceElement.setPointerCapture(ev.pointerId);

            const handler = theController.beginDrag(ev.offsetX, ev.offsetY);

            workspaceElement.style.cursor = "-webkit-grabbing";
            workspaceElement.onpointermove = (ev1) => handler(ev1.offsetX, ev1.offsetY);

            workspaceElement.onpointerup = () => {
                workspaceElement.onpointermove = null;
                workspaceElement.style.cursor = "";
            };
        };

        // Image element.

        imageElement.onload = () => theController.resizeContent(imageElement.naturalWidth, imageElement.naturalHeight);
    }
);
