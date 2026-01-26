export type Lv95Bbox = {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
};

export type Lv95Point = {
    easting: number;
    northing: number;
};

export type MapConfig = {
    id: string;
    name: string;
    worldWidth: number;
    worldHeight: number;
    lv95Bbox: Lv95Bbox;
    spawnLv95: Lv95Point;
    startAGL_m: number;
    wmtsLayer: string;
    wmtsOpacity: number;
    wmtsEnabled: boolean;
};
