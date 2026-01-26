import type { ChallengeSetup, RunConfig, WindConfig } from "../types";
import { FlightMode, ThermikVisibility } from "../types";
import type { Screen } from "./types";
import { challengeScenarios } from "../../game/challenge/scenarios";

type ChallengesCallbacks = {
    onStart: (runConfig: RunConfig) => void;
    onBack: () => void;
    onUpdate: (setup: ChallengeSetup) => void;
};

export const createChallengesScreen = (initial: ChallengeSetup, callbacks: ChallengesCallbacks): Screen => {
    const screen = document.createElement("div");
    screen.className = "screen screen-challenges";

    const card = document.createElement("div");
    card.className = "panel card";

    const title = document.createElement("h1");
    title.textContent = "Challenges";

    const layout = document.createElement("div");
    layout.className = "challenge-layout";

    const list = document.createElement("div");
    list.className = "challenge-list";

    const detail = document.createElement("div");
    detail.className = "challenge-detail";

    const detailTitle = document.createElement("h2");
    const detailDesc = document.createElement("p");
    detailDesc.className = "muted";

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

    detail.append(detailTitle, detailDesc, windSection);

    const buttonRow = document.createElement("div");
    buttonRow.className = "button-row";

    const startButton = createButton("Start", () => {
        const scenario = selectedScenario();
        if (!scenario) {
            return;
        }
        const wind = buildWindConfig({
            enabled: windToggleRow.toggle.checked,
            speedMps: Number(windSpeedRow.input.value),
            dirDeg: Number(windDirRow.input.value),
            indicator: windIndicatorRow.toggle.checked,
            drift: windDriftRow.toggle.checked,
            driftFactor: Number(windDriftFactorRow.input.value),
        });
        const runConfig: RunConfig = {
            mode: FlightMode.Training,
            thermikVisibility: ThermikVisibility.Visible,
            trainingStageId: null,
            mapId: scenario.mapDefinition.id,
            wind,
            startWithTargetArea: true,
            targetAreaEnabled: true,
            individualConfig: null,
            scenarioId: scenario.id,
        };
        callbacks.onUpdate({ scenarioId: scenario.id, wind });
        callbacks.onStart(runConfig);
    });
    const backButton = createButton("Zurueck", callbacks.onBack, "secondary");
    buttonRow.append(startButton, backButton);

    card.append(title, layout, buttonRow);
    screen.append(card);

    const scenarioInputs = challengeScenarios.map((scenario) => {
        const option = createRadio("challenge", scenario.id, scenario.name, scenario.description);
        list.append(option.wrapper);
        return { scenario, input: option.input };
    });

    layout.append(list, detail);

    const initialScenario = challengeScenarios.find((scenario) => scenario.id === initial.scenarioId) ?? challengeScenarios[0];
    scenarioInputs.forEach(({ input, scenario }) => {
        input.checked = scenario.id === initialScenario.id;
    });

    applyScenario(initialScenario);
    updateWindUI();

    scenarioInputs.forEach(({ input, scenario }) => {
        input.addEventListener("change", () => {
            if (input.checked) {
                applyScenario(scenario);
            }
        });
    });

    windToggleRow.toggle.addEventListener("change", () => {
        updateWindUI();
        notifyUpdate();
    });
    windSpeedRow.input.addEventListener("input", () => {
        windSpeedRow.value.textContent = `${Number(windSpeedRow.input.value).toFixed(1)} m/s`;
        notifyUpdate();
    });
    windDirRow.input.addEventListener("input", () => {
        applyWindDir(windDirRow.input, Number(windDirRow.input.value));
        notifyUpdate();
    });
    windDirRow.minus.addEventListener("click", () => {
        adjustWindDir(windDirRow.input, -5);
        notifyUpdate();
    });
    windDirRow.plus.addEventListener("click", () => {
        adjustWindDir(windDirRow.input, 5);
        notifyUpdate();
    });
    windIndicatorRow.toggle.addEventListener("change", notifyUpdate);
    windDriftRow.toggle.addEventListener("change", () => {
        updateWindUI();
        notifyUpdate();
    });
    windDriftFactorRow.input.addEventListener("input", () => {
        windDriftFactorRow.value.textContent = Number(windDriftFactorRow.input.value).toFixed(2);
        notifyUpdate();
    });

    return { element: screen };

    function selectedScenario() {
        return scenarioInputs.find(({ input }) => input.checked)?.scenario ?? null;
    }

    function applyScenario(scenario: (typeof challengeScenarios)[number]): void {
        detailTitle.textContent = scenario.name;
        detailDesc.textContent = scenario.description;

        if (scenario.id === initial.scenarioId) {
            applyWind(initial.wind);
        } else {
            applyWind(scenario.windPreset);
        }
        updateWindUI();
        callbacks.onUpdate({ scenarioId: scenario.id, wind: getWind() });
    }

    function applyWind(wind: WindConfig): void {
        windToggleRow.toggle.checked = wind.windEnabled;
        windSpeedRow.input.value = wind.windSpeedMps.toFixed(1);
        windSpeedRow.value.textContent = `${Number(windSpeedRow.input.value).toFixed(1)} m/s`;
        windDirRow.input.value = Math.round(wind.windDirDeg).toString();
        windIndicatorRow.toggle.checked = wind.windIndicatorEnabled;
        windDriftRow.toggle.checked = wind.thermalDriftEnabled;
        windDriftFactorRow.input.value = wind.thermalDriftFactor.toFixed(2);
        windDriftFactorRow.value.textContent = Number(windDriftFactorRow.input.value).toFixed(2);
    }

    function getWind(): WindConfig {
        return buildWindConfig({
            enabled: windToggleRow.toggle.checked,
            speedMps: Number(windSpeedRow.input.value),
            dirDeg: Number(windDirRow.input.value),
            indicator: windIndicatorRow.toggle.checked,
            drift: windDriftRow.toggle.checked,
            driftFactor: Number(windDriftFactorRow.input.value),
        });
    }

    function notifyUpdate(): void {
        const scenario = selectedScenario();
        if (!scenario) {
            return;
        }
        callbacks.onUpdate({ scenarioId: scenario.id, wind: getWind() });
    }

    function updateWindUI(): void {
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
    }
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

const applyWindDir = (input: HTMLInputElement, value: number): void => {
    const next = clamp(Math.round(value), 0, 359);
    input.value = next.toString();
};

const adjustWindDir = (input: HTMLInputElement, delta: number): void => {
    const base = Number(input.value) || 0;
    input.value = clamp(Math.round(base + delta), 0, 359).toString();
};

const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};
