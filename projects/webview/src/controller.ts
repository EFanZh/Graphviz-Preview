import * as images from "./images";
import { AutoLayout, LayoutState } from "./layout-state";
import { Channel, type ChannelClient, type ChannelMessage } from "../../shared/src/channel";
import {
    ExtensionCommand,
    type ExtensionRequest,
    type ExtensionResponse,
    type SaveImageRequest,
} from "../../shared/src/extension-api";
import { Position, Size } from "./layout";
import {
    type UpdatePreviewRequest,
    WebviewCommand,
    type WebviewRequest,
    type WebviewResponse,
} from "../../shared/src/webview-api";
import { type ParsedImage } from "./images";
import { ScaleMode } from "./layout-view";
import { type UiView } from "./ui-view";

const scaleStep = 1.2;
const offsetStep = 10;

export class Controller implements ChannelClient<WebviewRequest, WebviewResponse, ExtensionRequest> {
    private readonly channel = new Channel<WebviewRequest, WebviewResponse, ExtensionRequest, ExtensionResponse>();
    private parsedImages: ParsedImage[] = [];
    private currentImageIndex = 0;
    private layoutState?: LayoutState;

    public constructor(
        private readonly uiView: UiView,
        private readonly sender: (message: ChannelMessage<ExtensionRequest, WebviewResponse>) => void,
    ) {}

    private tryChangeImageIndex(diff: number) {
        const layoutState = this.layoutState;

        if (layoutState !== undefined) {
            const candidateNewIndex = Math.min(this.currentImageIndex, this.parsedImages.length - 1) + diff;
            const image = this.parsedImages[candidateNewIndex];

            if (image !== undefined) {
                this.currentImageIndex = candidateNewIndex;

                layoutState.onImageSizeChanged(this.uiView, image.width, image.height);
                this.uiView.setImage(candidateNewIndex + 1, this.parsedImages.length, image);
            }
        }
    }

    // ============================================== Webview commands ============================================== //

    private updatePreview(request: UpdatePreviewRequest) {
        if (request.success) {
            const parsedImages = request.images.map(images.parseImage);

            this.parsedImages = parsedImages;

            const effectiveImageIndex = Math.min(this.currentImageIndex, parsedImages.length - 1);
            const effectiveImage = parsedImages[effectiveImageIndex];

            if (effectiveImage === undefined) {
                this.uiView.setPreviewStatus("No graph.");
            } else {
                if (this.layoutState === undefined) {
                    const viewSize = this.uiView.getViewSize();

                    this.layoutState = new LayoutState(
                        viewSize.width,
                        viewSize.height,
                        effectiveImage.width,
                        effectiveImage.height,
                        new AutoLayout(true, true, new Size(2, 2)),
                        0,
                        0,
                        true,
                        1,
                    );

                    this.layoutState.initializeView(this.uiView);
                } else {
                    this.layoutState.onImageSizeChanged(this.uiView, effectiveImage.width, effectiveImage.height);
                }

                this.uiView.setImage(effectiveImageIndex + 1, parsedImages.length, effectiveImage);
            }
        } else {
            this.uiView.setPreviewStatus(request.reason);
        }
    }

    // =============================================== System events ================================================ //

    public receiveMessage(message: ChannelMessage<WebviewRequest, ExtensionResponse>) {
        this.channel.receiveMessage(this, message);
    }

    public onViewSizeChanged(width: number, height: number) {
        this.layoutState?.onViewSizeChanged(this.uiView, width, height);
    }

    public previousImage() {
        this.tryChangeImageIndex(-1);
    }

    public nextImage() {
        this.tryChangeImageIndex(1);
    }

    public toggleIsCenter() {
        this.layoutState?.toggleIsCenter(this.uiView);
    }

    public toggleIsIdentity() {
        this.layoutState?.toggleIsIdentity(this.uiView);
    }

    public setScaleMode(scaleMode: ScaleMode) {
        const layoutState = this.layoutState;

        if (layoutState !== undefined) {
            switch (scaleMode) {
                case ScaleMode.Fixed:
                    layoutState.switchToFixedLayout(this.uiView);

                    break;
                case ScaleMode.Fit:
                    layoutState.switchToFitLayout(this.uiView);

                    break;
                case ScaleMode.AutoFit:
                    layoutState.switchToAutoFitLayout(this.uiView);

                    break;
            }
        }
    }

    public onExportImageCommand() {
        this.channel.sendRequest(this, {
            command: ExtensionCommand.SaveImage,
        });
    }

    private moveBy(f: (position: Position) => void) {
        const layoutState = this.layoutState;

        if (layoutState !== undefined) {
            const position = layoutState.getImagePosition() ?? new Position(0, 0);

            f(position);

            layoutState.moveTo(this.uiView, position.x, position.y);
        }
    }

    public moveLeft() {
        this.moveBy((position) => (position.x -= offsetStep));
    }

    public moveUp() {
        this.moveBy((position) => (position.y -= offsetStep));
    }

    public moveRight() {
        this.moveBy((position) => (position.x += offsetStep));
    }

    public moveDown() {
        this.moveBy((position) => (position.y += offsetStep));
    }

    public startDrag(x: number, y: number): ((x: number, y: number) => void) | undefined {
        const layoutState = this.layoutState;

        return layoutState === undefined ? undefined : layoutState.startDrag(x, y).bind(layoutState, this.uiView);
    }

    public toggleIsIdentityAt(x: number, y: number) {
        this.layoutState?.toggleIsIdentityAt(this.uiView, x, y);
    }

    private zoomBy(f: (scale: number) => number) {
        const layoutState = this.layoutState;

        if (layoutState !== undefined) {
            const currentScale = layoutState.getImageScale();
            const newScale = f(currentScale ?? 1);

            layoutState.setScale(this.uiView, newScale);
        }
    }

    private zoomAtBy(x: number, y: number, f: (scale: number) => number) {
        const layoutState = this.layoutState;

        if (layoutState !== undefined) {
            const currentScale = layoutState.getImageScale();
            const newScale = f(currentScale ?? 1);

            layoutState.setScaleAt(this.uiView, x, y, newScale);
        }
    }

    public zoomIn() {
        this.zoomBy((scale) => scale * scaleStep);
    }

    public zoomInAt(x: number, y: number) {
        this.zoomAtBy(x, y, (scale) => scale * scaleStep);
    }

    public zoomOut() {
        this.zoomBy((scale) => scale / scaleStep);
    }

    public zoomOutAt(x: number, y: number) {
        this.zoomAtBy(x, y, (scale) => scale / scaleStep);
    }

    // ========================================= `ChannelClient` interface ========================================== //

    public send(data: ChannelMessage<SaveImageRequest, WebviewResponse>): void {
        this.sender(data);
    }

    public async receive(request: WebviewRequest): Promise<WebviewResponse> {
        switch (request.command) {
            case WebviewCommand.UpdatePreview:
                this.updatePreview(request);

                break;
        }
    }
}
