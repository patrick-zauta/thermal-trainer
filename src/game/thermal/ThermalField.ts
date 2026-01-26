import type { Point } from "../../data/mvpMap";
import { ThermikVisibility } from "../../app/types";
import type { WindConfig } from "../../app/types";

export type ThermalComponent = {
    baseCenter: Point;
    wMax: number;
    sigmaX: number;
    sigmaY: number;
    rotationRad: number;
    driftFactor: number;
    wobbleAmp: number;
    wobbleFreq: number;
    phase: number;
};

export type SinkBlob = {
    baseCenter: Point;
    wMax: number;
    sigma: number;
    driftFactor: number;
    wobbleAmp: number;
    wobbleFreq: number;
    phase: number;
};

type HeatmapOptions = {
    alphaScale: number;
};

const HEATMAP_UPDATE_INTERVAL = 0.1;
const MAX_UP = 3.2;
const MAX_DOWN = -2.8;

export class ThermalField {
    private readonly worldWidth: number;
    private readonly worldHeight: number;
    private readonly components: ThermalComponent[];
    private readonly sinks: SinkBlob[];
    private readonly gridW: number;
    private readonly gridH: number;
    private readonly heatmapCanvas: HTMLCanvasElement;
    private readonly heatmapCtx: CanvasRenderingContext2D;
    private heatmapImage: ImageData;
    private timeSec = 0;
    private wind: WindConfig;
    private heatmapTimer = 0;

    public constructor(
        worldWidth: number,
        worldHeight: number,
        components: ThermalComponent[],
        sinks: SinkBlob[],
        gridW = 200,
        gridH = 120,
    ) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.components = components;
        this.sinks = sinks;
        this.gridW = gridW;
        this.gridH = gridH;
        this.heatmapCanvas = document.createElement("canvas");
        this.heatmapCanvas.width = gridW;
        this.heatmapCanvas.height = gridH;
        const ctx = this.heatmapCanvas.getContext("2d");
        if (!ctx) {
            throw new Error("Heatmap context not available.");
        }
        this.heatmapCtx = ctx;
        this.heatmapImage = ctx.createImageData(gridW, gridH);
        this.wind = {
            windEnabled: false,
            windSpeedMps: 0,
            windDirDeg: 0,
            windIndicatorEnabled: true,
            thermalDriftEnabled: false,
            thermalDriftFactor: 0.6,
        };
        this.rebuildHeatmap();
    }

    public update(dt: number, timeNowSec: number, wind: WindConfig): void {
        this.timeSec = timeNowSec;
        this.wind = { ...wind };
        this.heatmapTimer += dt;
        if (this.heatmapTimer >= HEATMAP_UPDATE_INTERVAL) {
            this.heatmapTimer = 0;
            this.rebuildHeatmap();
        }
    }

    public sampleVerticalAir(x: number, y: number): number {
        let sum = 0;
        for (const component of this.components) {
            const center = this.getCenter(component);
            sum += gaussianElliptic(x, y, center, component);
        }
        for (const sink of this.sinks) {
            const center = this.getCenter(sink);
            sum += gaussianSink(x, y, center, sink);
        }
        return clamp(sum, -4, 4);
    }

    public renderOverlay(
        ctx: CanvasRenderingContext2D,
        visibility: ThermikVisibility,
        options: HeatmapOptions,
    ): void {
        if (visibility === ThermikVisibility.Hidden) {
            return;
        }
        const alphaScale = visibility === ThermikVisibility.Rings ? 0.25 : 0.6;
        ctx.save();
        ctx.globalAlpha *= alphaScale * options.alphaScale;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(this.heatmapCanvas, 0, 0, this.worldWidth, this.worldHeight);
        ctx.restore();
    }

    private rebuildHeatmap(): void {
        const data = this.heatmapImage.data;
        let idx = 0;
        for (let y = 0; y < this.gridH; y += 1) {
            const worldY = ((y + 0.5) / this.gridH) * this.worldHeight;
            for (let x = 0; x < this.gridW; x += 1) {
                const worldX = ((x + 0.5) / this.gridW) * this.worldWidth;
                const w = this.sampleVerticalAir(worldX, worldY);
                const color = mapWToColor(w);
                data[idx] = color.r;
                data[idx + 1] = color.g;
                data[idx + 2] = color.b;
                data[idx + 3] = color.a;
                idx += 4;
            }
        }
        this.heatmapCtx.putImageData(this.heatmapImage, 0, 0);
    }

    private getCenter(component: ThermalComponent | SinkBlob): Point {
        let x = component.baseCenter.x;
        let y = component.baseCenter.y;

        if (this.wind.windEnabled && this.wind.thermalDriftEnabled) {
            const dirRad = (this.wind.windDirDeg * Math.PI) / 180;
            const driftSpeed =
                this.wind.windSpeedMps * this.wind.thermalDriftFactor * Math.max(component.driftFactor, 0);
            x += Math.cos(dirRad) * driftSpeed * this.timeSec;
            y += Math.sin(dirRad) * driftSpeed * this.timeSec;
        }

        x += Math.sin(this.timeSec * component.wobbleFreq + component.phase) * component.wobbleAmp;
        y += Math.cos(this.timeSec * component.wobbleFreq * 0.9 + component.phase) * component.wobbleAmp;

        return { x, y };
    }
}

const gaussianElliptic = (
    x: number,
    y: number,
    center: Point,
    component: ThermalComponent,
): number => {
    const dx = x - center.x;
    const dy = y - center.y;
    const cos = Math.cos(component.rotationRad);
    const sin = Math.sin(component.rotationRad);
    const rx = cos * dx + sin * dy;
    const ry = -sin * dx + cos * dy;
    const sx = component.sigmaX > 0 ? component.sigmaX : 1;
    const sy = component.sigmaY > 0 ? component.sigmaY : 1;
    const exponent = -0.5 * ((rx / sx) ** 2 + (ry / sy) ** 2);
    return component.wMax * Math.exp(exponent);
};

const gaussianSink = (x: number, y: number, center: Point, sink: SinkBlob): number => {
    const dx = x - center.x;
    const dy = y - center.y;
    const sigma = sink.sigma > 0 ? sink.sigma : 1;
    const exponent = -0.5 * ((dx * dx + dy * dy) / (sigma * sigma));
    return sink.wMax * Math.exp(exponent);
};

const mapWToColor = (w: number): { r: number; g: number; b: number; a: number } => {
    const abs = Math.abs(w);
    if (abs < 0.08) {
        return { r: 0, g: 0, b: 0, a: 0 };
    }
    if (w > 0) {
        const t = clamp(w / MAX_UP, 0, 1);
        const color = lerpColor({ r: 245, g: 216, b: 107 }, { r: 227, g: 91, b: 91 }, t);
        return { ...color, a: Math.round(200 * t) };
    }
    const t = clamp(Math.abs(w / MAX_DOWN), 0, 1);
    const color = lerpColor({ r: 120, g: 170, b: 255 }, { r: 70, g: 110, b: 210 }, t);
    return { ...color, a: Math.round(190 * t) };
};

const lerpColor = (
    from: { r: number; g: number; b: number },
    to: { r: number; g: number; b: number },
    t: number,
): { r: number; g: number; b: number } => {
    return {
        r: Math.round(from.r + (to.r - from.r) * t),
        g: Math.round(from.g + (to.g - from.g) * t),
        b: Math.round(from.b + (to.b - from.b) * t),
    };
};

const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};
