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
    modeGroup.append(trainingOption.wrapper, freeOption.wrapper);

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
        const mode = trainingOption.input.checked ? "training" : "free";
        const visibility = mode === "training" ? (visibilitySelect.value as ThermalVisibility) : "hidden";
        callbacks.onStart({ mode, thermalVisibility: visibility, mapId: mapSelect.value as ModeSelection["mapId"] });
    });
    const backButton = createButton("Zurueck", callbacks.onBack, "secondary");

    buttonRow.append(startButton, backButton);

    card.append(title, modeGroup, visibilityGroup, mapGroup, buttonRow);
    screen.append(card);

    trainingOption.input.checked = initial.mode === "training";
    freeOption.input.checked = initial.mode === "free";
    visibilitySelect.value = initial.thermalVisibility;
    mapSelect.value = initial.mapId;

    const syncVisibility = (): void => {
        const active = trainingOption.input.checked;
        visibilityGroup.style.opacity = active ? "1" : "0.5";
        visibilitySelect.disabled = !active;
    };
    trainingOption.input.addEventListener("change", syncVisibility);
    freeOption.input.addEventListener("change", syncVisibility);
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
