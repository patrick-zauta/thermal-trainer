import { ThermikVisibility } from "../../app/types";
import type { WindConfig } from "../../app/types";
import type { MapId } from "../../data/mvpMap";

export type TrainingStagePreset = {
    id: number;
    label: string;
    defaultThermikVisibility: ThermikVisibility;
    defaultWind: WindConfig;
    mapId: MapId;
    targetAreaEnabled: boolean;
};

const baseWind: WindConfig = {
    windEnabled: false,
    windSpeedMps: 0,
    windDirDeg: 90,
    windIndicatorEnabled: true,
    thermalDriftEnabled: false,
    thermalDriftFactor: 0.6,
};

const withWind = (speed: number, drift: boolean): WindConfig => ({
    windEnabled: true,
    windSpeedMps: speed,
    windDirDeg: 90,
    windIndicatorEnabled: true,
    thermalDriftEnabled: drift,
    thermalDriftFactor: drift ? 0.6 : 0.6,
});

export const trainingStages: TrainingStagePreset[] = [
    {
        id: 1,
        label: "Stufe 1 Kurven Basics",
        defaultThermikVisibility: ThermikVisibility.Visible,
        defaultWind: { ...baseWind },
        mapId: "basis",
        targetAreaEnabled: true,
    },
    {
        id: 2,
        label: "Stufe 2 Kern enger",
        defaultThermikVisibility: ThermikVisibility.Visible,
        defaultWind: { ...baseWind },
        mapId: "basis",
        targetAreaEnabled: true,
    },
    {
        id: 3,
        label: "Stufe 3 Kern bewegt sich leicht",
        defaultThermikVisibility: ThermikVisibility.Visible,
        defaultWind: { ...baseWind },
        mapId: "basis",
        targetAreaEnabled: true,
    },
    {
        id: 4,
        label: "Stufe 4 Sinkzone sichtbar",
        defaultThermikVisibility: ThermikVisibility.Visible,
        defaultWind: { ...baseWind },
        mapId: "basis",
        targetAreaEnabled: true,
    },
    {
        id: 5,
        label: "Stufe 5 Zwei Thermiken Wechsel",
        defaultThermikVisibility: ThermikVisibility.Visible,
        defaultWind: { ...baseWind },
        mapId: "basis",
        targetAreaEnabled: true,
    },
    {
        id: 6,
        label: "Stufe 6 Wind schwach sichtbar",
        defaultThermikVisibility: ThermikVisibility.Rings,
        defaultWind: withWind(2.0, false),
        mapId: "basis",
        targetAreaEnabled: true,
    },
    {
        id: 7,
        label: "Stufe 7 Weniger visuelle Hilfe",
        defaultThermikVisibility: ThermikVisibility.Rings,
        defaultWind: withWind(2.8, false),
        mapId: "basis",
        targetAreaEnabled: true,
    },
    {
        id: 8,
        label: "Stufe 8 Thermik unsichtbar Sink sichtbar",
        defaultThermikVisibility: ThermikVisibility.Rings,
        defaultWind: withWind(3.2, false),
        mapId: "basis",
        targetAreaEnabled: true,
    },
    {
        id: 9,
        label: "Stufe 9 Karte an keine Kreise",
        defaultThermikVisibility: ThermikVisibility.Hidden,
        defaultWind: withWind(3.6, true),
        mapId: "swisstopo",
        targetAreaEnabled: true,
    },
    {
        id: 10,
        label: "Stufe 10 Task realistisch",
        defaultThermikVisibility: ThermikVisibility.Hidden,
        defaultWind: withWind(4.2, true),
        mapId: "swisstopo",
        targetAreaEnabled: true,
    },
];

export const getTrainingStage = (id: number): TrainingStagePreset => {
    return trainingStages.find((stage) => stage.id === id) ?? trainingStages[0];
};
