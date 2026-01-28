import type { MapDefinition, Point, TargetZone, Turnpoint } from "../../data/mvpMap";
import type { WindConfig } from "../../app/types";
import type { MapConfig } from "../map/MapConfig";
import type { SinkBlob, ThermalComponent } from "../thermal/ThermalField";
import { niesenMap } from "../map/maps/niesen";

export type ChallengeScenario = {
    id: string;
    name: string;
    description: string;
    mapDefinition: MapDefinition;
    mapConfig: MapConfig;
    spawn: Point;
    startAltitudeM: number;
    startExitRadius: number;
    turnpoints: Turnpoint[];
    goal: TargetZone & { minAltitudeM: number };
    windPreset: WindConfig;
    thermalField: { components: ThermalComponent[]; sinks: SinkBlob[] };
};

const niesenWind: WindConfig = {
    windEnabled: true,
    windSpeedMps: 3.0,
    windDirDeg: 240,
    windIndicatorEnabled: true,
    thermalDriftEnabled: true,
    thermalDriftFactor: 0.6,
};

const niesenTurnpoints: Turnpoint[] = [
    { name: "TP1: Spiez", center: { x: 520, y: 240 }, radius: 50, minAltitudeM: 0 },
    { name: "TP2: Frutigen", center: { x: 720, y: 540 }, radius: 50, minAltitudeM: 0 },
    { name: "TP3: Niesen", center: { x: 600, y: 330 }, radius: 50, minAltitudeM: 0 },
];

const niesenGoal: TargetZone & { minAltitudeM: number } = {
    center: { x: 610, y: 620 },
    radius: 60,
    minAltitudeM: 1200,
};

const niesenThermals: ThermalComponent[] = [
    {
        baseCenter: { x: 570, y: 380 },
        wMax: 3.2,
        sigmaX: 95,
        sigmaY: 70,
        rotationRad: 0.25,
        driftFactor: 1.1,
        wobbleAmp: 10,
        wobbleFreq: 0.22,
        phase: 0.6,
    },
    {
        baseCenter: { x: 540, y: 340 },
        wMax: 2.6,
        sigmaX: 85,
        sigmaY: 60,
        rotationRad: -0.1,
        driftFactor: 0.9,
        wobbleAmp: 8,
        wobbleFreq: 0.2,
        phase: 1.4,
    },
    {
        baseCenter: { x: 520, y: 260 },
        wMax: 2.4,
        sigmaX: 105,
        sigmaY: 75,
        rotationRad: 0.45,
        driftFactor: 1.0,
        wobbleAmp: 9,
        wobbleFreq: 0.18,
        phase: 2.0,
    },
    {
        baseCenter: { x: 700, y: 470 },
        wMax: 2.2,
        sigmaX: 100,
        sigmaY: 80,
        rotationRad: -0.35,
        driftFactor: 0.95,
        wobbleAmp: 8,
        wobbleFreq: 0.2,
        phase: 2.6,
    },
];

const niesenSinks: SinkBlob[] = [
    {
        baseCenter: { x: 760, y: 600 },
        wMax: -2.0,
        sigma: 280,
        driftFactor: 1.0,
        wobbleAmp: 6,
        wobbleFreq: 0.16,
        phase: 1.1,
    },
];

const niesenMapDefinition: MapDefinition = {
    id: "niesen-xc",
    name: "Niesen XC Task",
    thermals: [],
    sinkZones: [],
    turnpoints: niesenTurnpoints,
    target: { center: niesenGoal.center, radius: niesenGoal.radius },
};

export const challengeScenarios: ChallengeScenario[] = [
    {
        id: "niesen-xc",
        name: "Niesen XC Task",
        description: "Ein XC Task mit Rueckweg zum Niesen, inklusive Startausflug.",
        mapDefinition: niesenMapDefinition,
        mapConfig: niesenMap,
        spawn: { x: 592.5, y: 350.6 },
        startAltitudeM: 2600,
        startExitRadius: 80,
        turnpoints: niesenTurnpoints,
        goal: niesenGoal,
        windPreset: niesenWind,
        thermalField: { components: niesenThermals, sinks: niesenSinks },
    },
];

export const getScenarioById = (id: string | undefined): ChallengeScenario | null => {
    if (!id) {
        return null;
    }
    return challengeScenarios.find((scenario) => scenario.id === id) ?? null;
};
