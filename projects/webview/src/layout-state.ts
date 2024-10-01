import { type LayoutView, ScaleMode } from "./layout-view";
import { Position, Size } from "./layout";

// Scaling formula:
//
//     newImageX = anchorX - (anchorX - oldImageX) * (newScale / oldScale).

interface Layout {
    isCenter(): boolean;
    scaleMode(): ScaleMode;
}

export class FixedLayout implements Layout {
    public constructor(
        // If the position is center, this saves the original image display size, otherwise this is `null`.
        public savedImageDisplaySize: Size | null,
    ) {}

    // `Layout` interface.

    public isCenter(): boolean {
        return this.savedImageDisplaySize !== null;
    }

    public scaleMode(): ScaleMode {
        return ScaleMode.Fixed;
    }
}

export class AutoLayout implements Layout {
    public constructor(
        // If the layout is `AutoFit`, this is `true`, otherwise this is `false`.
        public isAutoFit: boolean,
        public readonly savedIsCenter: boolean,
        public readonly savedImageDisplaySize: Size,
    ) {}

    public isCenter(): boolean {
        return true;
    }

    public scaleMode(): ScaleMode {
        return this.isAutoFit ? ScaleMode.AutoFit : ScaleMode.Fit;
    }
}

export class LayoutState {
    public constructor(
        private viewWidth: number,
        private viewHeight: number,
        private imageWidth: number,
        private imageHeight: number,
        private layout: FixedLayout | AutoLayout,
        private imageX: number,
        private imageY: number,
        private isIdentity: boolean,
        private scale: number,
    ) {}

    public getImagePosition(): Position | null {
        return this.layout.isCenter() ? null : new Position(this.imageX, this.imageY);
    }

    private isAutoFitIdentity(): boolean {
        return this.imageWidth <= this.viewWidth && this.imageHeight <= this.viewHeight;
    }

    private calculateFitScale(): number {
        const xScale = this.viewWidth / this.imageWidth;
        const yScale = this.viewHeight / this.imageHeight;

        return Math.min(xScale, yScale);
    }

    private calculateAutoFitScale(): number | null {
        return this.isAutoFitIdentity() ? null : this.calculateFitScale();
    }

    public getImageScale(): number | null {
        if (this.layout instanceof FixedLayout) {
            return this.isIdentity ? null : this.scale;
        } else {
            return this.layout.isAutoFit ? this.calculateAutoFitScale() : this.calculateFitScale();
        }
    }

    public initializeView(view: LayoutView) {
        const position = this.getImagePosition();

        if (position === null) {
            view.setIsCenter(true);
            view.setImagePosition(0, 0);
        } else {
            view.setIsCenter(false);
            view.setImagePosition(position.x, position.y);
        }

        const scale = this.getImageScale();

        if (scale === null) {
            view.setIsIdentity(true);
            view.setImageDisplaySize(this.imageWidth, this.imageHeight);
            view.setImageScale(1);
        } else {
            view.setIsIdentity(false);
            view.setImageDisplaySize(this.imageWidth * scale, this.imageHeight * scale);
            view.setImageScale(scale);
        }

        view.setScaleMode(this.layout.scaleMode());
    }

    // =============================================== System events ================================================ //

    public onViewSizeChanged(view: LayoutView, width: number, height: number): void {
        const layout = this.layout;

        if (layout instanceof FixedLayout) {
            // Fixed.

            this.viewWidth = width;
            this.viewHeight = height;
        } else if (layout.isAutoFit) {
            // Auto fit.

            const oldIsIdentity = this.isAutoFitIdentity();

            this.viewWidth = width;
            this.viewHeight = height;

            const newScale = this.calculateAutoFitScale();

            if (newScale === null) {
                if (!oldIsIdentity) {
                    view.setIsIdentity(true);
                    view.setImageDisplaySize(this.imageWidth, this.imageHeight);
                    view.setImageScale(1);
                }
            } else {
                if (oldIsIdentity) {
                    view.setIsIdentity(false);
                }

                view.setImageDisplaySize(this.imageWidth * newScale, this.imageHeight * newScale);
                view.setImageScale(newScale);
            }
        } else {
            // Fit.

            this.viewWidth = width;
            this.viewHeight = height;

            const newScale = this.calculateFitScale();

            view.setImageDisplaySize(this.imageWidth * newScale, this.imageHeight * newScale);
            view.setImageScale(newScale);
        }
    }

    public onImageSizeChanged(view: LayoutView, width: number, height: number): void {
        let newScale;

        if (this.layout instanceof FixedLayout) {
            if (this.layout.isCenter()) {
                // Fixed identity, Fixed free.

                this.imageWidth = width;
                this.imageHeight = height;
            } else {
                // Fixed identity, Fixed free.

                this.imageX = (this.imageX * width) / this.imageWidth;
                this.imageY = (this.imageY * height) / this.imageHeight;
                this.imageWidth = width;
                this.imageHeight = height;

                view.setImagePosition(this.imageX, this.imageY);
            }

            newScale = this.isIdentity ? null : this.scale;
        } else if (this.layout.isAutoFit) {
            const oldIsIdentity = this.isAutoFitIdentity();

            this.imageWidth = width;
            this.imageHeight = height;

            newScale = this.calculateAutoFitScale();

            if (newScale === null) {
                if (!oldIsIdentity) {
                    // Auto fit fit -> Auto fit identity.

                    view.setIsIdentity(true);
                    view.setImageScale(1);
                }
            } else {
                // Auto fit identity, auto fit fit -> Auto fit fit.

                if (oldIsIdentity) {
                    view.setIsIdentity(false);
                }

                view.setImageScale(newScale);
            }
        } else {
            // Fit.

            this.imageWidth = width;
            this.imageHeight = height;

            newScale = this.calculateFitScale();

            view.setImageScale(newScale);
        }

        if (newScale !== null) {
            width *= newScale;
            height *= newScale;
        }

        view.setImageDisplaySize(width, height);
    }

    public toggleIsCenter(view: LayoutView) {
        let imageDisplayWidth = this.imageWidth;
        let imageDisplayHeight = this.imageHeight;

        if (this.layout instanceof FixedLayout) {
            if (!this.isIdentity) {
                imageDisplayWidth *= this.scale;
                imageDisplayHeight *= this.scale;
            }

            if (this.layout.savedImageDisplaySize === null) {
                // Fixed identity -> Fixed center identity.
                // Fixed free -> Fixed center.

                this.layout.savedImageDisplaySize = new Size(imageDisplayWidth, imageDisplayHeight);

                view.setImagePosition(0, 0);
            } else {
                // Fixed center identity -> Fixed identity.
                // Fixed center -> Fixed free.

                this.imageX = (this.imageX * imageDisplayWidth) / this.layout.savedImageDisplaySize.width;
                this.imageY = (this.imageY * imageDisplayHeight) / this.layout.savedImageDisplaySize.height;
                this.layout.savedImageDisplaySize = null;

                view.setImagePosition(this.imageX, this.imageY);
            }
        } else {
            // Auto fit identity -> Fixed identity.
            // Fit, Auto fit fit -> Fixed free.

            const scale = this.layout.isAutoFit ? this.calculateAutoFitScale() : this.calculateFitScale();

            if (scale !== null) {
                imageDisplayWidth *= scale;
                imageDisplayHeight *= scale;
            }

            this.imageX = (this.imageX * imageDisplayWidth) / this.layout.savedImageDisplaySize.width;
            this.imageY = (this.imageY * imageDisplayHeight) / this.layout.savedImageDisplaySize.height;
            this.layout = new FixedLayout(null);

            if (scale === null) {
                this.isIdentity = true;
            } else {
                this.scale = scale;
                this.isIdentity = false;
            }

            view.setImagePosition(this.imageX, this.imageY);
            view.setScaleMode(ScaleMode.Fixed);
        }
    }

    public toggleIsIdentity(view: LayoutView) {
        let imageDisplayWidth = this.imageWidth;
        let imageDisplayHeight = this.imageHeight;
        let imageScale;

        if (this.layout instanceof FixedLayout) {
            if (this.isIdentity) {
                this.isIdentity = false;

                if (!this.layout.isCenter()) {
                    // Fixed identity -> Fixed.

                    this.imageX *= this.scale;
                    this.imageY *= this.scale;

                    view.setImagePosition(this.imageX, this.imageY);
                }

                imageDisplayWidth *= this.scale;
                imageDisplayHeight *= this.scale;
                imageScale = this.scale;
            } else {
                this.isIdentity = true;

                if (!this.layout.isCenter()) {
                    // Fixed -> Fixed identity.

                    this.imageX /= this.scale;
                    this.imageY /= this.scale;

                    view.setImagePosition(this.imageX, this.imageY);
                }

                imageScale = 1;
            }
        } else {
            // Auto fit identity -> Fixed center.
            // Auto fit fit, fit -> Fixed center identity.

            const oldScale = this.layout.isAutoFit ? this.calculateAutoFitScale() : this.calculateFitScale();

            this.layout = new FixedLayout(this.layout.savedImageDisplaySize);

            if (oldScale === null) {
                this.isIdentity = false;

                imageDisplayWidth *= this.scale;
                imageDisplayHeight *= this.scale;
                imageScale = this.scale;
            } else {
                this.isIdentity = true;
                this.scale = oldScale;

                imageScale = 1;
            }

            view.setScaleMode(ScaleMode.Fixed);
        }

        view.setImageDisplaySize(imageDisplayWidth, imageDisplayHeight);
        view.setImageScale(imageScale);
    }

    public switchToFixedLayout(view: LayoutView) {
        if (this.layout instanceof AutoLayout) {
            const oldIsIdentity = this.layout.isAutoFit && this.isAutoFitIdentity();

            let newImageDisplayWidth = this.imageWidth;
            let newImageDisplayHeight = this.imageHeight;

            if (!this.isIdentity) {
                newImageDisplayWidth *= this.scale;
                newImageDisplayHeight *= this.scale;
            }

            if (this.layout.savedIsCenter) {
                this.layout = new FixedLayout(this.layout.savedImageDisplaySize);
            } else {
                this.imageX = (this.imageX * newImageDisplayWidth) / this.layout.savedImageDisplaySize.width;
                this.imageY = (this.imageY * newImageDisplayHeight) / this.layout.savedImageDisplaySize.height;
                this.layout = new FixedLayout(null);

                view.setIsCenter(false);
                view.setImagePosition(this.imageX, this.imageY);
            }

            if (this.isIdentity) {
                if (!oldIsIdentity) {
                    view.setIsIdentity(true);
                    view.setImageDisplaySize(newImageDisplayWidth, newImageDisplayHeight);
                    view.setImageScale(1);
                }
            } else {
                if (oldIsIdentity) {
                    view.setIsIdentity(false);
                }

                view.setImageDisplaySize(newImageDisplayWidth, newImageDisplayHeight);
                view.setImageScale(this.scale);
            }
        }
    }

    public switchToFitLayout(view: LayoutView) {
        if (this.layout instanceof FixedLayout) {
            // Fixed.

            const oldIsCenter = this.layout.isCenter();

            let savedImageDisplaySize = this.layout.savedImageDisplaySize;

            if (savedImageDisplaySize === null) {
                let imageDisplayWidth = this.imageWidth;
                let imageDisplayHeight = this.imageHeight;

                if (!this.isIdentity) {
                    imageDisplayWidth *= this.scale;
                    imageDisplayHeight *= this.scale;
                }

                savedImageDisplaySize = new Size(imageDisplayWidth, imageDisplayHeight);
            }

            this.layout = new AutoLayout(false, this.layout.isCenter(), savedImageDisplaySize);

            if (!oldIsCenter) {
                view.setIsCenter(true);
                view.setImagePosition(0, 0);
            }

            if (this.isIdentity) {
                view.setIsIdentity(false);
            }

            const scale = this.calculateFitScale();

            view.setImageDisplaySize(this.imageWidth * scale, this.imageHeight * scale);
            view.setImageScale(scale);
        } else {
            // Auto fit.

            this.layout.isAutoFit = false;

            if (this.isAutoFitIdentity()) {
                const scale = this.calculateFitScale();

                view.setIsIdentity(false);
                view.setImageDisplaySize(this.imageWidth * scale, this.imageHeight * scale);
                view.setImageScale(scale);
            }
        }
    }

    public switchToAutoFitLayout(view: LayoutView) {
        if (this.layout instanceof FixedLayout) {
            // Fixed.

            const oldIsCenter = this.layout.isCenter();

            let savedImageDisplaySize = this.layout.savedImageDisplaySize;

            if (savedImageDisplaySize === null) {
                let imageDisplayWidth = this.imageWidth;
                let imageDisplayHeight = this.imageHeight;

                if (!this.isIdentity) {
                    imageDisplayWidth *= this.scale;
                    imageDisplayHeight *= this.scale;
                }

                savedImageDisplaySize = new Size(imageDisplayWidth, imageDisplayHeight);
            }

            this.layout = new AutoLayout(true, this.layout.isCenter(), savedImageDisplaySize);

            if (!oldIsCenter) {
                view.setIsCenter(true);
                view.setImagePosition(0, 0);
            }

            const newScale = this.calculateAutoFitScale();

            if (newScale === null) {
                if (!this.isIdentity) {
                    view.setIsIdentity(true);
                    view.setImageDisplaySize(this.imageWidth, this.imageHeight);
                    view.setImageScale(1);
                }
            } else {
                if (this.isIdentity) {
                    view.setIsIdentity(false);
                }

                view.setImageDisplaySize(this.imageWidth * newScale, this.imageHeight * newScale);
                view.setImageScale(newScale);
            }
        } else {
            // Fit.

            this.layout.isAutoFit = true;

            if (this.isAutoFitIdentity()) {
                view.setIsIdentity(true);
                view.setImageDisplaySize(this.imageWidth, this.imageHeight);
                view.setImageScale(1);
            }
        }
    }

    public moveTo(view: LayoutView, x: number, y: number) {
        this.imageX = x;
        this.imageY = y;

        if (this.layout instanceof FixedLayout) {
            if (this.layout.isCenter()) {
                this.layout.savedImageDisplaySize = null;

                view.setIsCenter(false);
            }
        } else {
            const scale = this.layout.isAutoFit ? this.calculateAutoFitScale() : this.calculateFitScale();

            if (scale === null) {
                this.isIdentity = true;
            } else {
                this.scale = scale;
                this.isIdentity = false;
            }

            this.layout = new FixedLayout(null);

            view.setIsCenter(false);
            view.setScaleMode(ScaleMode.Fixed);
        }

        view.setImagePosition(x, y);
    }

    public startDrag(x: number, y: number): (view: LayoutView, x: number, y: number) => void {
        const startPosition = this.getImagePosition();
        let initialImageX;
        let initialImageY;

        if (startPosition === null) {
            initialImageX = 0;
            initialImageY = 0;
        } else {
            initialImageX = startPosition.x;
            initialImageY = startPosition.y;
        }

        const diffX = initialImageX - x;
        const diffY = initialImageY - y;

        return (view, x, y) => this.moveTo(view, diffX + x, diffY + y);
    }

    public toggleIsIdentityAt(view: LayoutView, x: number, y: number) {
        if (this.layout instanceof FixedLayout) {
            if (this.isIdentity) {
                // Fixed center identity, fixed identity -> Fixed free.

                this.isIdentity = false;

                if (this.layout.isCenter()) {
                    this.imageX = x - x * this.scale;
                    this.imageY = y - y * this.scale;
                    this.layout.savedImageDisplaySize = null;

                    view.setIsCenter(false);
                } else {
                    this.imageX = x - (x - this.imageX) * this.scale;
                    this.imageY = y - (y - this.imageY) * this.scale;
                }
            } else {
                // Fixed center, fixed free -> Fixed identity.

                this.isIdentity = true;

                if (this.layout.isCenter()) {
                    this.imageX = x - x / this.scale;
                    this.imageY = y - y / this.scale;
                    this.layout.savedImageDisplaySize = null;

                    view.setIsCenter(false);
                } else {
                    this.imageX = x - (x - this.imageX) / this.scale;
                    this.imageY = y - (y - this.imageY) / this.scale;
                }
            }
        } else {
            const oldScale = this.layout.isAutoFit ? this.calculateAutoFitScale() : this.calculateFitScale();

            if (oldScale === null) {
                // Auto fit identity -> Fixed free.

                this.isIdentity = false;

                this.imageX = x - x * this.scale;
                this.imageY = y - y * this.scale;
            } else {
                // Fit, auto fit fit -> Fixed identity.

                this.isIdentity = true;
                this.scale = oldScale;

                this.imageX = x - x / oldScale;
                this.imageY = y - y / oldScale;
            }

            this.layout = new FixedLayout(null);

            view.setIsCenter(false);
            view.setScaleMode(ScaleMode.Fixed);
        }

        view.setIsIdentity(this.isIdentity);
        view.setImagePosition(this.imageX, this.imageY);

        if (this.isIdentity) {
            view.setImageDisplaySize(this.imageWidth, this.imageHeight);
            view.setImageScale(1);
        } else {
            view.setImageDisplaySize(this.imageWidth * this.scale, this.imageHeight * this.scale);
            view.setImageScale(this.scale);
        }
    }

    public setScale(view: LayoutView, scale: number) {
        const oldIsFixedLayout = this.layout instanceof FixedLayout;
        let isCenter;
        let oldIsIdentity;

        if (this.layout instanceof FixedLayout) {
            isCenter = this.layout.isCenter();

            if (!isCenter) {
                let scaleChange = scale;

                if (!this.isIdentity) {
                    scaleChange /= this.scale;
                }

                this.imageX *= scaleChange;
                this.imageY *= scaleChange;
            }

            oldIsIdentity = this.isIdentity;
        } else {
            isCenter = true;
            oldIsIdentity = this.layout.isAutoFit && this.isAutoFitIdentity();

            this.layout = new FixedLayout(this.layout.savedImageDisplaySize);
        }

        this.isIdentity = false;
        this.scale = scale;

        if (oldIsIdentity) {
            view.setIsIdentity(false);
        }

        if (!oldIsFixedLayout) {
            view.setScaleMode(ScaleMode.Fixed);
        }

        if (!isCenter) {
            view.setImagePosition(this.imageX, this.imageY);
        }

        view.setImageDisplaySize(this.imageWidth * scale, this.imageHeight * scale);

        view.setImageScale(scale);
    }

    public setScaleAt(view: LayoutView, x: number, y: number, scale: number) {
        const oldIsFixedLayout = this.layout instanceof FixedLayout;
        let oldIsCenter;
        let oldIsIdentity;
        let oldImageX;
        let oldImageY;
        let scaleChange = scale;

        if (this.layout instanceof FixedLayout) {
            oldIsCenter = this.layout.isCenter();

            if (oldIsCenter) {
                this.layout.savedImageDisplaySize = null;

                oldImageX = 0;
                oldImageY = 0;
            } else {
                oldImageX = this.imageX;
                oldImageY = this.imageY;
            }

            oldIsIdentity = this.isIdentity;

            if (!oldIsIdentity) {
                scaleChange /= this.scale;
            }
        } else {
            oldIsCenter = true;
            oldImageX = 0;
            oldImageY = 0;

            const oldScale = this.layout.isAutoFit ? this.calculateAutoFitScale() : this.calculateFitScale();

            oldIsIdentity = oldScale === null;

            if (oldScale !== null) {
                scaleChange /= oldScale;
            }

            this.layout = new FixedLayout(null);
        }

        this.isIdentity = false;
        this.imageX = x - (x - oldImageX) * scaleChange;
        this.imageY = y - (y - oldImageY) * scaleChange;
        this.scale = scale;

        if (oldIsCenter) {
            view.setIsCenter(false);
        }

        if (oldIsIdentity) {
            view.setIsIdentity(false);
        }

        if (!oldIsFixedLayout) {
            view.setScaleMode(ScaleMode.Fixed);
        }

        view.setImagePosition(this.imageX, this.imageY);
        view.setImageDisplaySize(this.imageWidth * scale, this.imageHeight * scale);
        view.setImageScale(scale);
    }
}
