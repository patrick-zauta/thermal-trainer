import type { Lv95Point, MapConfig } from "./MapConfig";

type WorldPoint = {
    x: number;
    y: number;
};

export class MapManager {
    private config: MapConfig;

    public constructor(config: MapConfig) {
        this.config = config;
    }

    public getConfig(): MapConfig {
        return this.config;
    }

    public getWorldWidth(): number {
        return this.config.worldWidth;
    }

    public getWorldHeight(): number {
        return this.config.worldHeight;
    }

    public getSpawnWorld(): WorldPoint {
        return this.lv95ToWorld(this.config.spawnLv95);
    }

    // Mapping between canvas world coords and LV95, y axis inverted.
    public worldToLv95(world: WorldPoint): Lv95Point {
        const { lv95Bbox, worldWidth, worldHeight } = this.config;
        const easting = lv95Bbox.xmin + (world.x / worldWidth) * (lv95Bbox.xmax - lv95Bbox.xmin);
        const northing = lv95Bbox.ymax - (world.y / worldHeight) * (lv95Bbox.ymax - lv95Bbox.ymin);
        return { easting, northing };
    }

    public lv95ToWorld(point: Lv95Point): WorldPoint {
        const { lv95Bbox, worldWidth, worldHeight } = this.config;
        const x = ((point.easting - lv95Bbox.xmin) / (lv95Bbox.xmax - lv95Bbox.xmin)) * worldWidth;
        const y = ((lv95Bbox.ymax - point.northing) / (lv95Bbox.ymax - lv95Bbox.ymin)) * worldHeight;
        return { x, y };
    }
}
