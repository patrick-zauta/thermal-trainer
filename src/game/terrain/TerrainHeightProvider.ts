import type { MapManager } from "../map/MapManager";
import { LazyGridHeightField } from "./LazyGridHeightField";

export class TerrainHeightProvider {
    private readonly mapManager: MapManager;
    private readonly heightField: LazyGridHeightField;

    public constructor(mapManager: MapManager, cellSize = 250) {
        this.mapManager = mapManager;
        const config = mapManager.getConfig();
        this.heightField = new LazyGridHeightField(config.lv95Bbox, cellSize);
    }

    public getHeightAtWorld(worldX: number, worldY: number): number | null {
        const lv95 = this.mapManager.worldToLv95({ x: worldX, y: worldY });
        return this.heightField.getHeightAt(lv95.easting, lv95.northing);
    }

    public getHeightAtLv95(easting: number, northing: number): number | null {
        return this.heightField.getHeightAt(easting, northing);
    }
}
