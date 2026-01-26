import type { IndividualConfig, RunConfig, WindConfig } from "../types";
import { FlightMode, ThermikVisibility } from "../types";
import type { Screen } from "./types";
import { getTrainingStage, trainingStages } from "../../game/config/trainingStages";
import { mapDefinitions } from "../../data/mvpMap";

const DEFAULT_INDIVIDUAL: IndividualConfig = {
    thermalCount: 2,
    sinkEnabled: true,
    thermalDynamics: "medium",
    turnpointCount: 1,
    targetRadius: 50,
};

type ModeScreenCallbacks = {
    onStart: (selection: RunConfig) => void;
    onBack: () => void;
};

export const createModeScreen = (initial: RunConfig, callbacks: ModeScreenCallbacks): Screen => {
    const screen = document.createElement("div");
    screen.className = "screen screen-mode";

    const card = document.createElement("div");
    card.className = "panel card";

    const title = document.createElement("h1");
    title.textContent = "Modus auswaehlen";

    const modeGroup = document.createElement("div");
    modeGroup.className = "option-group";

    const trainingOption = createRadio(
        "mode",
        FlightMode.Training,
        "Training",
        "Thermiktraining mit Zielbereich.",
    );
    const freeOption = createRadio(
        "mode",
        FlightMode.FreeFlight,
        "Free Flight",
        "Freier Flug ohne Trainingshilfe.",
    );
    const individualOption = createRadio(
        "mode",
        FlightMode.Individual,
        "Individuell",
        "Eigene Parameter fuer Thermik und Turnpoints.",
    );
    modeGroup.append(trainingOption.wrapper, freeOption.wrapper, individualOption.wrapper);

    const visibilityGroup = document.createElement("div");
    visibilityGroup.className = "option-group";

    const visibilityLabel = document.createElement("p");
    visibilityLabel.className = "option-label";
    visibilityLabel.textContent = "Thermik Sichtbarkeit";

    const visibilitySelect = document.createElement("select");
    visibilitySelect.className = "select";
    const visibilityOptions: Array<{ label: string; value: ThermikVisibility }> = [
        { label: "Sichtbar", value: ThermikVisibility.Visible },
        { label: "Ringe", value: ThermikVisibility.Rings },
        { label: "Unsichtbar", value: ThermikVisibility.Hidden },
    ];
    visibilityOptions.forEach((option) => {
        const entry = document.createElement("option");
        entry.value = option.value;
        entry.textContent = option.label;
        visibilitySelect.appendChild(entry);
    });

    visibilityGroup.append(visibilityLabel, visibilitySelect);

    const stageGroup = document.createElement("div");
    stageGroup.className = "option-group";

    const stageLabel = document.createElement("p");
    stageLabel.className = "option-label";
    stageLabel.textContent = "Trainingsstufe";

    const stageSelect = document.createElement("select");
    stageSelect.className = "select";
    trainingStages.forEach((stage) => {
        const entry = document.createElement("option");
        entry.value = stage.id.toString();
        entry.textContent = stage.label;
        stageSelect.appendChild(entry);
    });

    stageGroup.append(stageLabel, stageSelect);

    const mapGroup = document.createElement("div");
    mapGroup.className = "option-group";

    const mapLabel = document.createElement("p");
    mapLabel.className = "option-label";
    mapLabel.textContent = "Karte";

    const mapSelect = document.createElement("select");
    mapSelect.className = "select";

    const availableMapIds = new Set(mapDefinitions.map((map) => map.id));
    const mapOptions: Array<{ label: string; value: RunConfig["mapId"] }> = [
        { label: "Basis Training (weiss)", value: "basis" },
    ];
    if (availableMapIds.has("swisstopo")) {
        mapOptions.push({ label: "Swisstopo Demo", value: "swisstopo" });
    }

    const fallbackMap = mapDefinitions.find((map) => map.id === initial.mapId);
    if (fallbackMap && !mapOptions.some((option) => option.value === fallbackMap.id)) {
        mapOptions.push({ label: fallbackMap.name, value: fallbackMap.id });
    }

    mapOptions.forEach((option) => {
        const entry = document.createElement("option");
        entry.value = option.value;
        entry.textContent = option.label;
        mapSelect.appendChild(entry);
    });

    mapGroup.append(mapLabel, mapSelect);

    const windSection = document.createElement("div");
    windSection.className = "section";

    const windHeader = document.createElement("h2");
    windHeader.textContent = "Wind";

    const windToggleRow = createToggleRow("Wind aktiv", initial.wind.windEnabled);
    const windSpeedRow = createSliderRow("Windstaerke", 0, 10, 0.1, initial.wind.windSpeedMps, "m/s", 1);
    const windDirRow = createDirectionRow(initial.wind.windDirDeg);
    const windIndicatorRow = createToggleRow("Windanzeige", initial.wind.windIndicatorEnabled);
    const windDriftRow = createToggleRow("Thermik Drift", initial.wind.thermalDriftEnabled);
    const windDriftFactorRow = createSliderRow(
        "Drift Faktor",
        0,
        1,
        0.05,
        initial.wind.thermalDriftFactor,
        "",
        2,
    );

    windSection.append(
        windHeader,
        windToggleRow.row,
        windSpeedRow.row,
        windDirRow.row,
        windIndicatorRow.row,
        windDriftRow.row,
        windDriftFactorRow.row,
    );

    const individualSection = document.createElement("div");
    individualSection.className = "section";

    const individualHeader = document.createElement("h2");
    individualHeader.textContent = "Individuell";

    const individualState = initial.individualConfig ?? DEFAULT_INDIVIDUAL;
    const individualThermalRow = createNumberRow("Thermiken", 1, 3, individualState.thermalCount);
    const individualSinkRow = createToggleRow("Sinkzonen", individualState.sinkEnabled);
    const individualDynamicsRow = createSelectRow("Thermik Dynamik", [
        { label: "Niedrig", value: "low" },
        { label: "Mittel", value: "medium" },
        { label: "Hoch", value: "high" },
    ]);
    const individualTurnpointRow = createNumberRow("Turnpoints", 1, 2, individualState.turnpointCount);
    const individualTargetRow = createNumberRow("Zielradius", 35, 80, individualState.targetRadius);

    individualDynamicsRow.select.value = individualState.thermalDynamics;

    individualSection.append(
        individualHeader,
        individualThermalRow.row,
        individualSinkRow.row,
        individualDynamicsRow.row,
        individualTurnpointRow.row,
        individualTargetRow.row,
    );

    const buttonRow = document.createElement("div");
    buttonRow.className = "button-row";

    const startButton = createButton("Start", () => {
        const mode = getSelectedMode(trainingOption.input, freeOption.input, individualOption.input);
        const trainingStageId = mode === FlightMode.FreeFlight ? null : clampStage(Number(stageSelect.value));
        const runConfig: RunConfig = {
            mode,
            thermikVisibility: visibilitySelect.value as ThermikVisibility,
            trainingStageId,
            mapId: mapSelect.value as RunConfig["mapId"],
            wind: buildWindConfig({
                enabled: windToggleRow.toggle.checked,
                speedMps: Number(windSpeedRow.input.value),
                dirDeg: Number(windDirRow.input.value),
                indicator: windIndicatorRow.toggle.checked,
                drift: windDriftRow.toggle.checked,
                driftFactor: Number(windDriftFactorRow.input.value),
            }),
            startWithTargetArea: mode !== FlightMode.FreeFlight,
            targetAreaEnabled: mode !== FlightMode.FreeFlight,
            individualConfig:
                mode === FlightMode.Individual
                    ? {
                          thermalCount: clampNumber(individualThermalRow.input.value, 1, 3),
                          sinkEnabled: individualSinkRow.toggle.checked,
                          thermalDynamics: toDynamics(individualDynamicsRow.select.value),
                          turnpointCount: clampNumber(individualTurnpointRow.input.value, 1, 2),
                          targetRadius: clampNumber(individualTargetRow.input.value, 35, 80),
                      }
                    : null,
        };
        callbacks.onStart(runConfig);
    });
    const backButton = createButton("Zurueck", callbacks.onBack, "secondary");

    buttonRow.append(startButton, backButton);

    card.append(
        title,
        modeGroup,
        visibilityGroup,
        stageGroup,
        mapGroup,
        windSection,
        individualSection,
        buttonRow,
    );
    screen.append(card);

    const initialStageId = clampStage(initial.trainingStageId ?? 1);
    const preset = getTrainingStage(initialStageId);
    const dirty = {
        thermikVisibility: initial.thermikVisibility !== preset.defaultThermikVisibility,
        mapId: initial.mapId !== preset.mapId,
        windEnabled: initial.wind.windEnabled !== preset.defaultWind.windEnabled,
        windSpeedMps: Math.abs(initial.wind.windSpeedMps - preset.defaultWind.windSpeedMps) > 0.01,
        windDirDeg: Math.abs(initial.wind.windDirDeg - preset.defaultWind.windDirDeg) > 0.5,
        windIndicatorEnabled: initial.wind.windIndicatorEnabled !== preset.defaultWind.windIndicatorEnabled,
        thermalDriftEnabled: initial.wind.thermalDriftEnabled !== preset.defaultWind.thermalDriftEnabled,
        thermalDriftFactor: Math.abs(initial.wind.thermalDriftFactor - preset.defaultWind.thermalDriftFactor) > 0.01,
    };

    trainingOption.input.checked = initial.mode === FlightMode.Training;
    freeOption.input.checked = initial.mode === FlightMode.FreeFlight;
    individualOption.input.checked = initial.mode === FlightMode.Individual;
    visibilitySelect.value = initial.thermikVisibility;
    mapSelect.value = mapOptions.some((option) => option.value === initial.mapId) ? initial.mapId : mapOptions[0].value;
    stageSelect.value = initialStageId.toString();

    windSpeedRow.value.textContent = `${Number(windSpeedRow.input.value).toFixed(1)} m/s`;
    windDriftFactorRow.value.textContent = Number(windDriftFactorRow.input.value).toFixed(2);

    const applyStageDefaults = (): void => {
        const selectedStage = getTrainingStage(clampStage(Number(stageSelect.value)));
        if (!dirty.thermikVisibility) {
            visibilitySelect.value = selectedStage.defaultThermikVisibility;
        }
        if (!dirty.mapId) {
            const desired = mapOptions.some((option) => option.value === selectedStage.mapId)
                ? selectedStage.mapId
                : mapOptions[0].value;
            mapSelect.value = desired;
        }
        if (!dirty.windEnabled) {
            windToggleRow.toggle.checked = selectedStage.defaultWind.windEnabled;
        }
        if (!dirty.windSpeedMps) {
            windSpeedRow.input.value = selectedStage.defaultWind.windSpeedMps.toFixed(1);
            windSpeedRow.value.textContent = `${Number(windSpeedRow.input.value).toFixed(1)} m/s`;
        }
        if (!dirty.windDirDeg) {
            windDirRow.input.value = Math.round(selectedStage.defaultWind.windDirDeg).toString();
        }
        if (!dirty.windIndicatorEnabled) {
            windIndicatorRow.toggle.checked = selectedStage.defaultWind.windIndicatorEnabled;
        }
        if (!dirty.thermalDriftEnabled) {
            windDriftRow.toggle.checked = selectedStage.defaultWind.thermalDriftEnabled;
        }
        if (!dirty.thermalDriftFactor) {
            windDriftFactorRow.input.value = selectedStage.defaultWind.thermalDriftFactor.toFixed(2);
            windDriftFactorRow.value.textContent = Number(windDriftFactorRow.input.value).toFixed(2);
        }
        updateWindUI();
    };

    const updateWindUI = (): void => {
        const windOn = windToggleRow.toggle.checked;
        const driftOn = windDriftRow.toggle.checked;
        windSpeedRow.input.disabled = !windOn;
        windDirRow.input.disabled = !windOn;
        windDirRow.minus.disabled = !windOn;
        windDirRow.plus.disabled = !windOn;
        windIndicatorRow.toggle.disabled = !windOn;
        windDriftRow.toggle.disabled = !windOn;
        windDriftFactorRow.input.disabled = !windOn || !driftOn;
        windSection.style.opacity = windOn ? "1" : "0.6";
        windDriftFactorRow.row.style.display = windOn && driftOn ? "flex" : "none";
    };

    const syncModeUI = (): void => {
        const mode = getSelectedMode(trainingOption.input, freeOption.input, individualOption.input);
        const isTraining = mode === FlightMode.Training;
        const isFree = mode === FlightMode.FreeFlight;
        const isIndividual = mode === FlightMode.Individual;

        stageGroup.style.opacity = isFree ? "0.5" : "1";
        stageSelect.disabled = isFree;
        individualSection.style.display = isIndividual ? "flex" : "none";

        if (isTraining) {
            applyStageDefaults();
        }
    };

    visibilitySelect.addEventListener("change", () => {
        dirty.thermikVisibility = true;
    });

    mapSelect.addEventListener("change", () => {
        dirty.mapId = true;
    });

    stageSelect.addEventListener("change", () => {
        if (trainingOption.input.checked || individualOption.input.checked) {
            applyStageDefaults();
        }
    });

    windToggleRow.toggle.addEventListener("change", () => {
        dirty.windEnabled = true;
        updateWindUI();
    });

    windSpeedRow.input.addEventListener("input", () => {
        dirty.windSpeedMps = true;
        const value = clamp(Number(windSpeedRow.input.value), 0, 10);
        windSpeedRow.value.textContent = `${value.toFixed(1)} m/s`;
    });

    windDirRow.input.addEventListener("input", () => {
        dirty.windDirDeg = true;
        const raw = Number(windDirRow.input.value);
        const value = Number.isFinite(raw) ? raw : 0;
        windDirRow.input.value = clamp(Math.round(value), 0, 359).toString();
    });

    windDirRow.minus.addEventListener("click", () => {
        dirty.windDirDeg = true;
        adjustWindDir(windDirRow.input, -5);
    });

    windDirRow.plus.addEventListener("click", () => {
        dirty.windDirDeg = true;
        adjustWindDir(windDirRow.input, 5);
    });

    windIndicatorRow.toggle.addEventListener("change", () => {
        dirty.windIndicatorEnabled = true;
    });

    windDriftRow.toggle.addEventListener("change", () => {
        dirty.thermalDriftEnabled = true;
        updateWindUI();
    });

    windDriftFactorRow.input.addEventListener("input", () => {
        dirty.thermalDriftFactor = true;
        const value = clamp(Number(windDriftFactorRow.input.value), 0, 1);
        windDriftFactorRow.value.textContent = value.toFixed(2);
    });

    trainingOption.input.addEventListener("change", syncModeUI);
    freeOption.input.addEventListener("change", syncModeUI);
    individualOption.input.addEventListener("change", syncModeUI);

    updateWindUI();
    syncModeUI();

    return { element: screen };
};

const createRadio = (name: string, value: string, title: string, description: string) => {
    const wrapper = document.createElement("label");
    wrapper.className = "option-card";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = name;
    input.value = value;

    const textWrap = document.createElement("div");
    textWrap.className = "option-text";

    const heading = document.createElement("span");
    heading.textContent = title;
    heading.className = "option-title";

    const detail = document.createElement("span");
    detail.textContent = description;
    detail.className = "option-detail";

    textWrap.append(heading, detail);
    wrapper.append(input, textWrap);

    return { wrapper, input };
};

const createButton = (label: string, onClick: () => void, variant?: "secondary"): HTMLButtonElement => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = variant ? `btn ${variant}` : "btn";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
};

const createNumberRow = (label: string, min: number, max: number, value: number) => {
    const row = document.createElement("div");
    row.className = "row";

    const labelEl = document.createElement("span");
    labelEl.textContent = label;

    const input = document.createElement("input");
    input.type = "number";
    input.min = min.toString();
    input.max = max.toString();
    input.step = "1";
    input.value = Math.round(value).toString();
    input.className = "number-input";

    row.append(labelEl, input);
    return { row, input };
};

const createSelectRow = (label: string, options: Array<{ label: string; value: string }>) => {
    const row = document.createElement("div");
    row.className = "row";

    const labelEl = document.createElement("span");
    labelEl.textContent = label;

    const select = document.createElement("select");
    select.className = "select";

    options.forEach((option) => {
        const entry = document.createElement("option");
        entry.value = option.value;
        entry.textContent = option.label;
        select.appendChild(entry);
    });

    row.append(labelEl, select);
    return { row, select };
};

const createSliderRow = (
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    unit: string,
    precision: number,
) => {
    const row = document.createElement("div");
    row.className = "row";

    const labelEl = document.createElement("span");
    labelEl.textContent = label;

    const valueEl = document.createElement("span");
    valueEl.className = "value";

    const input = document.createElement("input");
    input.type = "range";
    input.min = min.toString();
    input.max = max.toString();
    input.step = step.toString();
    input.value = value.toFixed(precision);
    input.className = "slider";
    valueEl.textContent = unit ? `${Number(input.value).toFixed(precision)} ${unit}` : input.value;

    row.append(labelEl, input, valueEl);
    return { row, input, value: valueEl };
};

const createDirectionRow = (value: number) => {
    const row = document.createElement("div");
    row.className = "row";

    const labelEl = document.createElement("span");
    labelEl.textContent = "Richtung Grad";

    const controls = document.createElement("div");
    controls.className = "inline-controls";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.className = "btn secondary small";
    minus.textContent = "-5";

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = "359";
    input.step = "1";
    input.value = Math.round(value).toString();
    input.className = "number-input";

    const plus = document.createElement("button");
    plus.type = "button";
    plus.className = "btn secondary small";
    plus.textContent = "+5";

    controls.append(minus, input, plus);
    row.append(labelEl, controls);

    return { row, input, minus, plus };
};

const createToggleRow = (label: string, value: boolean) => {
    const row = document.createElement("div");
    row.className = "row";

    const labelEl = document.createElement("span");
    labelEl.textContent = label;

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.checked = value;

    row.append(labelEl, toggle);
    return { row, toggle };
};

const getSelectedMode = (
    training: HTMLInputElement,
    free: HTMLInputElement,
    individual: HTMLInputElement,
): FlightMode => {
    if (training.checked) {
        return FlightMode.Training;
    }
    if (free.checked) {
        return FlightMode.FreeFlight;
    }
    if (individual.checked) {
        return FlightMode.Individual;
    }
    return FlightMode.Training;
};

const buildWindConfig = (input: {
    enabled: boolean;
    speedMps: number;
    dirDeg: number;
    indicator: boolean;
    drift: boolean;
    driftFactor: number;
}): WindConfig => {
    return {
        windEnabled: input.enabled,
        windSpeedMps: clamp(input.speedMps, 0, 10),
        windDirDeg: clamp(Math.round(input.dirDeg), 0, 359),
        windIndicatorEnabled: input.indicator,
        thermalDriftEnabled: input.drift,
        thermalDriftFactor: clamp(input.driftFactor, 0, 1),
    };
};

const toDynamics = (value: string): IndividualConfig["thermalDynamics"] => {
    if (value === "low" || value === "high") {
        return value;
    }
    return "medium";
};

const clampNumber = (value: string, min: number, max: number): number => {
    const num = Number(value);
    if (!Number.isFinite(num)) {
        return min;
    }
    return clamp(Math.round(num), min, max);
};

const clampStage = (value: number): number => {
    if (!Number.isFinite(value)) {
        return 1;
    }
    return clamp(Math.round(value), 1, 10);
};

const adjustWindDir = (input: HTMLInputElement, delta: number): void => {
    const base = Number(input.value) || 0;
    input.value = clamp(Math.round(base + delta), 0, 359).toString();
};

const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};
