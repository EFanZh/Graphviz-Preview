import { PreviewMessage } from "../extension";
import * as app from "./app";
import * as controller from "./controller";

function onReady(callback: () => void): void {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", callback);
    } else {
        callback();
    }
}

onReady(() => {
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

    class ControllerEventListener implements app.IAppEventListener {
        public onImageChanged(image: string): void {
            imageElement.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(image)}`;
        }

        public onStatusChanged(status: string | null): void {
            statusElement.textContent = status;
        }

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

        public onLayoutChanged(x: number, y: number, width: number, height: number, zoom: number): void {
            zoomElement.textContent = `${Math.round(zoom * 10000) / 100} %`;
            imageElement.style.cssText = `left:${x}px;top:${y}px;width:${width * zoom}px;height:${height * zoom}px`;
        }
    }

    const theApp = app.App.create(
        workspaceElement.offsetWidth,
        workspaceElement.offsetHeight,
        new ControllerEventListener()
    );

    // Window events.

    window.onmessage = (ev) => {
        const message = ev.data as PreviewMessage;

        if (message.type === "success") {
            theApp.setImage(message.image);
        } else {
            theApp.setStatus(message.message);
        }
    };

    window.onresize = () => theApp.resize(workspaceElement.offsetWidth, workspaceElement.offsetHeight);

    // Identity element.

    identityElement.onclick = () => theApp.makeIdentity();

    // Center element.

    centerElement.onclick = () => theApp.makeCenter();

    // Zoom mode elements.

    function updateZoomMode(this: HTMLElement): void {
        const checkedElement = this as HTMLInputElement;

        if (checkedElement.checked) {
            switch (checkedElement.value) {
                case "fixed":
                    theApp.setZoomMode(controller.ZoomMode.Fixed);
                    break;
                case "fit":
                    theApp.setZoomMode(controller.ZoomMode.Fit);
                    break;
                case "auto-fit":
                    theApp.setZoomMode(controller.ZoomMode.AutoFit);
                    break;
            }
        }
    }

    zoomModeFixedElement.onchange = updateZoomMode;
    zoomModeFitElement.onchange = updateZoomMode;
    zoomModeAutoFitElement.onchange = updateZoomMode;

    // Export element.

    exportElement.onclick = () => window.parent.postMessage({ type: "export", image: theApp.image }, "*");

    // Workspace element.

    workspaceElement.onclick = (ev) => {
        if (ev.detail % 2 === 0) {
            theApp.toggleOverview(ev.offsetX, ev.offsetY);
        }
    };

    workspaceElement.onmousewheel = (ev) => {
        if (ev.deltaY < 0) {
            theApp.zoomIn(ev.offsetX, ev.offsetY);
        } else {
            theApp.zoomOut(ev.offsetX, ev.offsetY);
        }
    };

    workspaceElement.onpointerdown = (ev) => {
        ev.preventDefault();

        workspaceElement.setPointerCapture(ev.pointerId);

        const handler = theApp.beginDrag(ev.offsetX, ev.offsetY);

        workspaceElement.style.cursor = "-webkit-grabbing";
        workspaceElement.onpointermove = (ev1) => handler(ev1.offsetX, ev1.offsetY);

        workspaceElement.onpointerup = () => {
            workspaceElement.onpointermove = null;
            workspaceElement.style.cursor = "";
        };
    };
});
