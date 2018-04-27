import { ExtensionRequest, ExtensionResponse, PreviewRequest, PreviewResponse } from "../messages";
import { createMessenger, IMessagePort, IReceiveMessage, ISendMessage } from "../messenger";
import * as app from "./app";
import * as controller from "./controller";

declare var acquireVsCodeApi: any;

const vscode = acquireVsCodeApi();

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

    class AppEventListener implements app.IAppEventListener {
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

    let theApp: app.App;

    // Message handler.

    class ExtensionPort implements
        IMessagePort<
        ISendMessage<ExtensionRequest, PreviewResponse>, IReceiveMessage<ExtensionResponse, PreviewRequest>
        > {
        public send(message: ISendMessage<ExtensionRequest, PreviewResponse>): void {
            vscode.postMessage(message, "*");
        }

        public onReceive(handler: (message: IReceiveMessage<ExtensionResponse, PreviewRequest>) => void): void {
            window.onmessage = (ev) => {
                handler(ev.data);
            };
        }
    }

    async function handleRequest(message: PreviewRequest): Promise<PreviewResponse> {
        switch (message.type) {
            case "initialize":
                theApp = app.App.create(
                    workspaceElement.offsetWidth,
                    workspaceElement.offsetHeight,
                    new AppEventListener()
                );
                break;
            case "restore":
                theApp = app.App.fromArchive(message.archive, new AppEventListener());

                // TODO: Is this really necessary?
                theApp.resize(workspaceElement.offsetWidth, workspaceElement.offsetHeight);
                break;
            case "success":
                try {
                    theApp.setImage(message.image);
                } catch (error) {
                    theApp.setStatus(error.toString());
                }
                break;
            case "failure":
                theApp.setStatus(message.message);
                break;
            case "serialize":
                return {
                    result: theApp.serialize(),
                    type: "serializeResponse"
                };
        }

        return undefined;
    }

    // TODO: Maybe remove type annotation sometime later.
    const messenger = createMessenger<ExtensionRequest, ExtensionResponse, PreviewRequest, PreviewResponse>(
        new ExtensionPort(),
        handleRequest
    );

    // Window events.

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

    exportElement.onclick = async () => messenger({
        image: theApp.image,
        type: "export"
    });

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
