export type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type TouchLayout = {
    leftSlider: Rect;
    rightSlider: Rect;
    speedbarButton: Rect;
    pauseButton: Rect;
};

export type TouchControlState = {
    leftTarget: number;
    rightTarget: number;
    speedbarPressed: boolean;
};

export class TouchControls {
    private layout: TouchLayout = {
        leftSlider: { x: 0, y: 0, width: 0, height: 0 },
        rightSlider: { x: 0, y: 0, width: 0, height: 0 },
        speedbarButton: { x: 0, y: 0, width: 0, height: 0 },
        pauseButton: { x: 0, y: 0, width: 0, height: 0 },
    };
    private visible = false;
    private uiScale = 1;

    public updateLayout(width: number, height: number): void {
        const dpr = window.devicePixelRatio || 1;
        const cssWidth = width / dpr;
        const cssHeight = height / dpr;
        const mobile = cssWidth < 900 || cssHeight < 600;
        const scaleBoost = mobile ? 1.12 : 1;
        this.uiScale = dpr * scaleBoost;

        const marginCss = clamp(cssWidth * 0.03, 16, 28);
        const speedbarHeightCss = clamp(cssHeight * 0.12, 56, 90);
        const speedbarWidthCss = clamp(cssWidth * 0.42, 180, 280);
        const availableSliderHeight = Math.max(200, cssHeight - speedbarHeightCss - marginCss * 2 - 24);
        const sliderHeightCss = clamp(cssHeight * 0.7, 240, availableSliderHeight);
        const sliderWidthCss = clamp(cssWidth * 0.18, 90, 150);

        const margin = marginCss * this.uiScale;
        const sliderHeight = sliderHeightCss * this.uiScale;
        const sliderWidth = sliderWidthCss * this.uiScale;
        const sliderY = height - sliderHeight - margin;

        const leftSlider = {
            x: margin,
            y: sliderY,
            width: sliderWidth,
            height: sliderHeight,
        };
        const rightSlider = {
            x: width - margin - sliderWidth,
            y: sliderY,
            width: sliderWidth,
            height: sliderHeight,
        };

        const speedbarWidth = speedbarWidthCss * this.uiScale;
        const speedbarHeight = speedbarHeightCss * this.uiScale;
        const speedbarButton = {
            x: (width - speedbarWidth) / 2,
            y: height - speedbarHeight - margin,
            width: speedbarWidth,
            height: speedbarHeight,
        };

        const pauseSize = clamp(cssWidth * 0.1, 48, 68) * this.uiScale;
        const pauseButton = {
            x: width - pauseSize - margin,
            y: margin,
            width: pauseSize,
            height: pauseSize,
        };

        this.layout = { leftSlider, rightSlider, speedbarButton, pauseButton };
    }

    public setVisible(visible: boolean): void {
        this.visible = visible;
    }

    public isVisible(): boolean {
        return this.visible;
    }

    public getLayout(): TouchLayout {
        return this.layout;
    }

    public render(ctx: CanvasRenderingContext2D, state: TouchControlState): void {
        if (!this.visible) {
            return;
        }

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 0.8;

        this.drawSlider(ctx, this.layout.leftSlider, state.leftTarget, "Links");
        this.drawSlider(ctx, this.layout.rightSlider, state.rightTarget, "Rechts");
        this.drawSpeedbar(ctx, this.layout.speedbarButton, state.speedbarPressed);
        this.drawPause(ctx, this.layout.pauseButton);

        ctx.restore();
    }

    private drawSlider(ctx: CanvasRenderingContext2D, rect: Rect, target: number, label: string): void {
        drawRoundedRect(ctx, rect, 18 * this.uiScale, "#2b2b2b", 0.15);

        const fillHeight = rect.height * clamp(target, 0, 1);
        const fillRect: Rect = {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: fillHeight,
        };
        drawRoundedRect(ctx, fillRect, 12 * this.uiScale, "#2b2b2b", 0.35);

        const knobY = rect.y + fillHeight;
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.beginPath();
        ctx.arc(rect.x + rect.width / 2, knobY, rect.width * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.font = `${Math.round(14 * this.uiScale)}px "Space Grotesk", "Trebuchet MS", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(label, rect.x + rect.width / 2, rect.y - 6 * this.uiScale);
    }

    private drawSpeedbar(ctx: CanvasRenderingContext2D, rect: Rect, active: boolean): void {
        drawRoundedRect(ctx, rect, 18 * this.uiScale, "#2b2b2b", active ? 0.45 : 0.25);
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.font = `${Math.round(16 * this.uiScale)}px "Space Grotesk", "Trebuchet MS", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Speedbar", rect.x + rect.width / 2, rect.y + rect.height / 2);
    }

    private drawPause(ctx: CanvasRenderingContext2D, rect: Rect): void {
        drawRoundedRect(ctx, rect, 12 * this.uiScale, "#2b2b2b", 0.25);
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.font = `${Math.round(12 * this.uiScale)}px "Space Grotesk", "Trebuchet MS", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Pause", rect.x + rect.width / 2, rect.y + rect.height / 2);
    }
}

const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    radius: number,
    color: string,
    alpha: number,
): void => {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    const x = rect.x;
    const y = rect.y;
    const w = rect.width;
    const h = rect.height;
    const r = Math.min(radius, w / 2, h / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
};

const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};
