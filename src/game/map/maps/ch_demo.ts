import type { MapConfig } from "../MapConfig";

export const chDemoMap: MapConfig = {
    id: "ch_demo",
    name: "CH Demo",
    worldWidth: 1200,
    worldHeight: 700,
    lv95Bbox: {
        xmin: 2710000,
        ymin: 1090000,
        xmax: 2730000,
        ymax: 1102000,
    },
    spawnLv95: {
        easting: 2720000,
        northing: 1095000,
    },
    startAGL_m: 500,
    wmtsLayer: "ch.swisstopo.pixelkarte-grau",
    wmtsOpacity: 0.65,
    wmtsEnabled: true,
};
