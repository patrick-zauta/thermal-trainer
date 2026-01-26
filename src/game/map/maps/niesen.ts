import type { MapConfig } from "../MapConfig";

export const niesenMap: MapConfig = {
    id: "niesen",
    name: "Niesen Region",
    worldWidth: 1200,
    worldHeight: 700,
    lv95Bbox: {
        xmin: 2569000,
        ymin: 1221000,
        xmax: 2585000,
        ymax: 1230500,
    },
    spawnLv95: {
        easting: 2576900,
        northing: 1225742,
    },
    startAGL_m: 500,
    wmtsLayer: "ch.swisstopo.pixelkarte-grau",
    wmtsOpacity: 0.65,
    wmtsEnabled: true,
};
