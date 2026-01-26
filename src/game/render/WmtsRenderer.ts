import type { MapManager } from "../map/MapManager";
import { WmtsTileSource } from "./WmtsTileSource";

const RESOLUTIONS = [
    4000, 3750, 3500, 3250, 3000, 2750, 2500, 2250, 2000, 1750, 1500, 1250, 1000, 750, 650, 500, 250, 100,
    50, 20, 10, 5, 2.5, 2, 1.5, 1, 0.5,
];
const TILE_SIZE_PX = 256;
const EXTENT_CH = [2420000, 130000, 2900000, 1350000];
const ORIGIN = [EXTENT_CH[0], EXTENT_CH[3]];

type WmtsSettings = {
    enabled: boolean;
    layer: string;
    opacity: number;
};

export class WmtsRenderer {
    private readonly mapManager: MapManager;
    private readonly tileSource: WmtsTileSource;

    public constructor(mapManager: MapManager, tileSource = new WmtsTileSource()) {
        this.mapManager = mapManager;
        this.tileSource = tileSource;
    }

    public draw(
        ctx: CanvasRenderingContext2D,
        transform: { a: number; b: number; c: number; d: number; offsetX: number; offsetY: number },
        canvasWidth: number,
        settings: WmtsSettings,
    ): void {
        if (!settings.enabled || settings.opacity <= 0) {
            return;
        }

        const config = this.mapManager.getConfig();
        const mapWidthMeters = config.lv95Bbox.xmax - config.lv95Bbox.xmin;
        const metersPerCanvasPixel = mapWidthMeters / Math.max(canvasWidth, 1);
        const z = selectZoom(metersPerCanvasPixel);
        const resolution = RESOLUTIONS[z];
        const tileSpan = resolution * TILE_SIZE_PX;

        // WMTS tile indices for the LV95 bbox.
        const minCol = Math.floor((config.lv95Bbox.xmin - ORIGIN[0]) / tileSpan);
        const maxCol = Math.floor((config.lv95Bbox.xmax - ORIGIN[0]) / tileSpan);
        const minRow = Math.floor((ORIGIN[1] - config.lv95Bbox.ymax) / tileSpan);
        const maxRow = Math.floor((ORIGIN[1] - config.lv95Bbox.ymin) / tileSpan);

        ctx.save();
        ctx.setTransform(transform.a, transform.b, transform.c, transform.d, transform.offsetX, transform.offsetY);
        ctx.globalAlpha = settings.opacity;

        for (let row = minRow; row <= maxRow; row += 1) {
            for (let col = minCol; col <= maxCol; col += 1) {
                const image = this.tileSource.requestTile(settings.layer, z, col, row);
                if (!image) {
                    continue;
                }
                const tileMinX = ORIGIN[0] + col * tileSpan;
                const tileMaxX = tileMinX + tileSpan;
                const tileMaxY = ORIGIN[1] - row * tileSpan;
                const tileMinY = tileMaxY - tileSpan;

                const topLeft = this.mapManager.lv95ToWorld({ easting: tileMinX, northing: tileMaxY });
                const bottomRight = this.mapManager.lv95ToWorld({ easting: tileMaxX, northing: tileMinY });
                const drawWidth = bottomRight.x - topLeft.x;
                const drawHeight = bottomRight.y - topLeft.y;

                ctx.drawImage(image, topLeft.x, topLeft.y, drawWidth, drawHeight);
            }
        }

        ctx.restore();
    }
}

const selectZoom = (metersPerPixel: number): number => {
    let closestIndex = 0;
    let smallestDelta = Infinity;
    RESOLUTIONS.forEach((value, index) => {
        const delta = Math.abs(value - metersPerPixel);
        if (delta < smallestDelta) {
            smallestDelta = delta;
            closestIndex = index;
        }
    });
    return Math.min(Math.max(closestIndex, 0), RESOLUTIONS.length - 1);
};
