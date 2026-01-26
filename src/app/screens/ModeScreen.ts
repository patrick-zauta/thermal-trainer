import type { ModeSelection, ThermalVisibility } from "../types";
import { mapDefinitions } from "../../data/mvpMap";
import type { Screen } from "./types";

type ModeScreenCallbacks = {
    onStart: (selection: ModeSelection) => void;
    onBack: () => void;
};

export const createModeScreen = (initial: ModeSelection, callbacks: ModeScreenCallbacks): Screen => {
    const screen = document.createElement("div");
    screen.className = "screen screen-mode";

    const card = document.createElement("div");
    card.className = "panel card";

    const title = document.createElement("h1");
    title.textContent = "Modus auswaehlen";

    const modeGroup = document.createElement("div");
    modeGroup.className = "option-group";

    const trainingOption = createRadio("mode", "training", "Training", "Thermiktraining mit Zielbereich.");
    const freeOption = createRadio("mode", "free", "Free Flight", "Freier Flug ohne Trainingshilfe.");
    const randomOption = createRadio("mode", "random", "Zufall", "Zufaellige Thermiken, Turnpoints und Ziel.");
    modeGroup.append(trainingOption.wrapper, freeOption.wrapper, randomOption.wrapper);

    const visibilityGroup = document.createElement("div");
    visibilityGroup.className = "option-group";

    const visibilityLabel = document.createElement("p");
    visibilityLabel.className = "option-label";
    visibilityLabel.textContent = "Thermik Sichtbarkeit";

    const visibilitySelect = document.createElement("select");
    visibilitySelect.className = "select";
    const visibilityOptions: Array<{ label: string; value: ThermalVisibility }> = [
        { label: "Sichtbar", value: "visible" },
        { label: "Ringe", value: "rings" },
        { label: "Unsichtbar", value: "hidden" },
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
    [
        { label: "Stufe 1 ohne Terrain", value: "1" },
        { label: "Stufe 2 mit Terrain", value: "2" },
    ].forEach((option) => {
        const entry = document.createElement("option");
        entry.value = option.value;
        entry.textContent = option.label;
        stageSelect.appendChild(entry);
    });

    stageGroup.append(stageLabel, stageSelect);

    const randomGroup = document.createElement("div");
    randomGroup.className = "option-group";

    const randomLabel = document.createElement("p");
    randomLabel.className = "option-label";
    randomLabel.textContent = "Zufallsparameter";

    const thermalRow = createNumberRow("Thermiken", 1, 4, initial.randomSettings.thermalCount);
    const turnpointRow = createNumberRow("Turnpoints", 1, 2, initial.randomSettings.turnpointCount);
    const strengthRow = createRangeRow("Thermik Staerke", 0.7, 1.4, 0.05, initial.randomSettings.strength);
    const targetRow = createNumberRow("Zielradius", 35, 80, initial.randomSettings.targetRadius);

    randomGroup.append(randomLabel, thermalRow.row, turnpointRow.row, strengthRow.row, targetRow.row);

    const mapGroup = document.createElement("div");
    mapGroup.className = "option-group";

    const mapLabel = document.createElement("p");
    mapLabel.className = "option-label";
    mapLabel.textContent = "Karte";

    const mapSelect = document.createElement("select");
    mapSelect.className = "select";
    mapDefinitions.forEach((map) => {
        const entry = document.createElement("option");
        entry.value = map.id;
        entry.textContent = map.name;
        mapSelect.appendChild(entry);
    });

    mapGroup.append(mapLabel, mapSelect);

    const buttonRow = document.createElement("div");
    buttonRow.className = "button-row";

    const startButton = createButton("Start", () => {
        const mode = trainingOption.input.checked ? "training" : randomOption.input.checked ? "random" : "free";
        const visibility =
            mode === "training" ? (visibilitySelect.value as ThermalVisibility) : mode === "random" ? "visible" : "hidden";
        const randomSettings = {
            thermalCount: clampNumber(thermalRow.input.value, 1, 4),
            turnpointCount: clampNumber(turnpointRow.input.value, 1, 2),
            strength: clampNumber(strengthRow.input.value, 0.7, 1.4),
            targetRadius: clampNumber(targetRow.input.value, 35, 80),
        };
        const trainingStage = Number(stageSelect.value) === 2 ? 2 : 1;
        callbacks.onStart({
            mode,
            thermalVisibility: visibility,
            mapId: mapSelect.value as ModeSelection["mapId"],
            trainingStage,
            randomSettings,
        });
    });
    const backButton = createButton("Zurueck", callbacks.onBack, "secondary");

    buttonRow.append(startButton, backButton);

    card.append(title, modeGroup, visibilityGroup, stageGroup, randomGroup, mapGroup, buttonRow);
    screen.append(card);

    trainingOption.input.checked = initial.mode === "training";
    freeOption.input.checked = initial.mode === "free";
    randomOption.input.checked = initial.mode === "random";
    visibilitySelect.value = initial.thermalVisibility;
    mapSelect.value = initial.mapId;
    stageSelect.value = initial.trainingStage.toString();

    const syncVisibility = (): void => {
        const trainingActive = trainingOption.input.checked;
        const randomActive = randomOption.input.checked;
        visibilityGroup.style.opacity = trainingActive ? "1" : "0.5";
        visibilitySelect.disabled = !trainingActive;
        stageGroup.style.opacity = trainingActive || randomActive ? "1" : "0.5";
        stageSelect.disabled = !(trainingActive || randomActive);
        randomGroup.style.opacity = randomActive ? "1" : "0.5";
        thermalRow.input.disabled = !randomActive;
        turnpointRow.input.disabled = !randomActive;
        strengthRow.input.disabled = !randomActive;
        targetRow.input.disabled = !randomActive;
        mapGroup.style.opacity = randomActive ? "0.5" : "1";
        mapSelect.disabled = randomActive;
    };
    trainingOption.input.addEventListener("change", syncVisibility);
    freeOption.input.addEventListener("change", syncVisibility);
    randomOption.input.addEventListener("change", syncVisibility);
    syncVisibility();

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

const createRangeRow = (label: string, min: number, max: number, step: number, value: number) => {
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
    input.value = value.toString();
    input.className = "slider";
    valueEl.textContent = Number(input.value).toFixed(2);

    input.addEventListener("input", () => {
        valueEl.textContent = Number(input.value).toFixed(2);
    });

    row.append(labelEl, input, valueEl);
    return { row, input };
};

const clampNumber = (value: string, min: number, max: number): number => {
    const num = Number(value);
    if (!Number.isFinite(num)) {
        return min;
    }
    return Math.min(Math.max(num, min), max);
};
