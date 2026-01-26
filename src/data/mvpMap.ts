export type Point = {
    x: number;
    y: number;
};

export type ThermalRing = {
    radius: number;
    verticalAir: number;
};

export type Thermal = {
    name: string;
    center: Point;
    rings: ThermalRing[];
};

export type SinkZone = {
    name: string;
    center: Point;
    radius: number;
    verticalAir: number;
};

export type Turnpoint = {
    name: string;
    center: Point;
    radius: number;
    minAltitudeM: number;
};

export type TargetZone = {
    center: Point;
    radius: number;
};

export type MapId = "basis" | "ridge" | "valley" | "lake" | "random";

export type MapDefinition = {
    id: MapId;
    name: string;
    thermals: Thermal[];
    sinkZones: SinkZone[];
    turnpoints: Turnpoint[];
    target: TargetZone;
};

export const worldWidth = 1200;
export const worldHeight = 700;

export const mapDefinitions: MapDefinition[] = [
    {
        id: "basis",
        name: "Basis Training",
        thermals: [
            {
                name: "Thermik A",
                center: { x: 400, y: 220 },
                rings: [
                    { radius: 40, verticalAir: 3.0 },
                    { radius: 90, verticalAir: 2.0 },
                    { radius: 150, verticalAir: 1.0 },
                ],
            },
            {
                name: "Thermik B",
                center: { x: 900, y: 200 },
                rings: [
                    { radius: 60, verticalAir: 3.0 },
                    { radius: 140, verticalAir: 2.0 },
                    { radius: 240, verticalAir: 1.0 },
                ],
            },
        ],
        sinkZones: [
            {
                name: "Sink",
                center: { x: 650, y: 520 },
                radius: 140,
                verticalAir: -2.0,
            },
        ],
        turnpoints: [
            { name: "TP1", center: { x: 240, y: 140 }, radius: 28, minAltitudeM: 560 },
            { name: "TP2", center: { x: 860, y: 560 }, radius: 28, minAltitudeM: 640 },
        ],
        target: { center: { x: 1050, y: 600 }, radius: 50 },
    },
    {
        id: "ridge",
        name: "Ridge Linie",
        thermals: [
            {
                name: "Thermik Alpha",
                center: { x: 260, y: 180 },
                rings: [
                    { radius: 35, verticalAir: 3.0 },
                    { radius: 85, verticalAir: 2.0 },
                    { radius: 150, verticalAir: 1.0 },
                ],
            },
            {
                name: "Thermik Bravo",
                center: { x: 760, y: 360 },
                rings: [
                    { radius: 55, verticalAir: 3.0 },
                    { radius: 130, verticalAir: 2.0 },
                    { radius: 210, verticalAir: 1.0 },
                ],
            },
        ],
        sinkZones: [
            {
                name: "Lee",
                center: { x: 520, y: 560 },
                radius: 150,
                verticalAir: -2.0,
            },
        ],
        turnpoints: [
            { name: "TP1", center: { x: 620, y: 140 }, radius: 28, minAltitudeM: 600 },
            { name: "TP2", center: { x: 360, y: 520 }, radius: 28, minAltitudeM: 700 },
        ],
        target: { center: { x: 1080, y: 120 }, radius: 50 },
    },
    {
        id: "valley",
        name: "Tal Zug",
        thermals: [
            {
                name: "Thermik Nord",
                center: { x: 320, y: 520 },
                rings: [
                    { radius: 45, verticalAir: 3.0 },
                    { radius: 105, verticalAir: 2.0 },
                    { radius: 180, verticalAir: 1.0 },
                ],
            },
            {
                name: "Thermik Sued",
                center: { x: 960, y: 130 },
                rings: [
                    { radius: 50, verticalAir: 3.0 },
                    { radius: 120, verticalAir: 2.0 },
                    { radius: 200, verticalAir: 1.0 },
                ],
            },
        ],
        sinkZones: [
            {
                name: "Schatten",
                center: { x: 640, y: 300 },
                radius: 160,
                verticalAir: -2.0,
            },
        ],
        turnpoints: [
            { name: "TP1", center: { x: 220, y: 300 }, radius: 28, minAltitudeM: 580 },
            { name: "TP2", center: { x: 850, y: 560 }, radius: 28, minAltitudeM: 680 },
        ],
        target: { center: { x: 1060, y: 640 }, radius: 50 },
    },
    {
        id: "lake",
        name: "See Runde",
        thermals: [
            {
                name: "Thermik West",
                center: { x: 220, y: 240 },
                rings: [
                    { radius: 40, verticalAir: 3.0 },
                    { radius: 95, verticalAir: 2.0 },
                    { radius: 165, verticalAir: 1.0 },
                ],
            },
            {
                name: "Thermik Ost",
                center: { x: 920, y: 420 },
                rings: [
                    { radius: 60, verticalAir: 3.0 },
                    { radius: 135, verticalAir: 2.0 },
                    { radius: 220, verticalAir: 1.0 },
                ],
            },
        ],
        sinkZones: [
            {
                name: "Kaltsee",
                center: { x: 600, y: 460 },
                radius: 150,
                verticalAir: -2.0,
            },
        ],
        turnpoints: [
            { name: "TP1", center: { x: 520, y: 120 }, radius: 28, minAltitudeM: 620 },
            { name: "TP2", center: { x: 1080, y: 620 }, radius: 28, minAltitudeM: 720 },
        ],
        target: { center: { x: 980, y: 200 }, radius: 50 },
    },
];

export const thermals = mapDefinitions[0].thermals;
export const sinkZones = mapDefinitions[0].sinkZones;

export const getMapDefinition = (id: MapId): MapDefinition => {
    return mapDefinitions.find((map) => map.id === id) ?? mapDefinitions[0];
};
