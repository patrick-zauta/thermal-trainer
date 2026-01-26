import { actionLabels, formatKey } from "../labels";
import { defaultSettings } from "../defaults";
import type { Action, Settings } from "../types";
import type { Screen } from "./types";

type SettingsCallbacks = {
    onUpdate: (settings: Settings) => void;
    onBack: () => void;
    onFullscreen: () => void;
};

export const createSettingsScreen = (settings: Settings, callbacks: SettingsCallbacks): Screen => {
    const screen = document.createElement("div");
    screen.className = "screen screen-settings";

    const card = document.createElement("div");
    card.className = "panel card";

    const title = document.createElement("h1");
    title.textContent = "Einstellungen";

    const audioSection = document.createElement("div");
    audioSection.className = "section";
    audioSection.id = "section-audio";

    const audioHeader = document.createElement("h2");
    audioHeader.textContent = "Audio";

    const audioToggleRow = document.createElement("div");
    audioToggleRow.className = "row";

    const audioToggleLabel = document.createElement("span");
    audioToggleLabel.textContent = "Audio aktiv";

    const audioToggle = document.createElement("input");
    audioToggle.type = "checkbox";
    audioToggle.checked = settings.audioEnabled;

    audioToggleRow.append(audioToggleLabel, audioToggle);

    const volumeRow = document.createElement("div");
    volumeRow.className = "row";

    const volumeLabel = document.createElement("span");
    volumeLabel.textContent = "Hauptlautstaerke";

    const volumeValue = document.createElement("span");
    volumeValue.className = "value";

    const volumeSlider = document.createElement("input");
    volumeSlider.type = "range";
    volumeSlider.min = "0";
    volumeSlider.max = "100";
    volumeSlider.value = Math.round(settings.masterVolume * 100).toString();
    volumeSlider.className = "slider";
    volumeValue.textContent = `${volumeSlider.value}%`;

    volumeRow.append(volumeLabel, volumeSlider, volumeValue);

    audioSection.append(audioHeader, audioToggleRow, volumeRow);

    const screenSection = document.createElement("div");
    screenSection.className = "section";
    screenSection.id = "section-display";

    const screenHeader = document.createElement("h2");
    screenHeader.textContent = "Anzeige";

    const fullscreenButton = createButton("Vollbild", callbacks.onFullscreen, "secondary");
    screenSection.append(screenHeader, fullscreenButton);

    const controlSection = document.createElement("div");
    controlSection.className = "section";
    controlSection.id = "section-control";

    const controlHeader = document.createElement("h2");
    controlHeader.textContent = "Steuerung";

    const touchRow = document.createElement("div");
    touchRow.className = "row";

    const touchLabel = document.createElement("span");
    touchLabel.textContent = "Touch Steuerung";

    const touchSelect = document.createElement("select");
    touchSelect.className = "select";
    [
        { label: "Auto", value: "auto" },
        { label: "Ein", value: "on" },
        { label: "Aus", value: "off" },
    ].forEach((option) => {
        const entry = document.createElement("option");
        entry.value = option.value;
        entry.textContent = option.label;
        touchSelect.appendChild(entry);
    });
    touchSelect.value = settings.touchControls;

    touchRow.append(touchLabel, touchSelect);
    controlSection.append(controlHeader, touchRow);

    const keySection = document.createElement("div");
    keySection.className = "section";
    keySection.id = "section-keys";

    const keyHeader = document.createElement("h2");
    keyHeader.textContent = "Tastenbelegung";

    const keyList = document.createElement("div");
    keyList.className = "key-list";

    const warning = document.createElement("div");
    warning.className = "warning";

    let captureAction: Action | null = null;
    let currentSettings = settings;
    let currentBindings = { ...settings.keybindings };

    const updateList = (): void => {
        keyList.replaceChildren();
        (Object.keys(actionLabels) as Action[]).forEach((action) => {
            const row = document.createElement("div");
            row.className = "key-row";

            const label = document.createElement("span");
            label.textContent = actionLabels[action];

            const keyButton = createButton(formatKey(currentBindings[action]), () => {
                startCapture(action);
            }, "ghost");

            if (captureAction === action) {
                keyButton.textContent = "Taste druecken";
                keyButton.classList.add("active");
            }

            row.append(label, keyButton);
            keyList.append(row);
        });
    };

    const startCapture = (action: Action): void => {
        captureAction = action;
        warning.textContent = "Taste druecken, Esc bricht ab.";
        updateList();
    };

    const finishCapture = (code: string): void => {
        if (!captureAction) {
            return;
        }

        const duplicate = (Object.keys(currentBindings) as Action[]).find(
            (action) => currentBindings[action] === code && action !== captureAction,
        );

        if (duplicate) {
            warning.textContent = "Taste ist bereits vergeben.";
            return;
        }

        currentBindings = { ...currentBindings, [captureAction]: code };
        currentSettings = {
            ...currentSettings,
            keybindings: currentBindings,
        };
        callbacks.onUpdate(currentSettings);
        warning.textContent = "";
        captureAction = null;
        updateList();
    };

    const cancelCapture = (): void => {
        captureAction = null;
        warning.textContent = "";
        updateList();
    };

    const handleKeydown = (event: KeyboardEvent): void => {
        if (!captureAction) {
            return;
        }
        event.preventDefault();
        if (event.code === "Escape") {
            cancelCapture();
            return;
        }
        finishCapture(event.code);
    };

    window.addEventListener("keydown", handleKeydown);

    updateList();

    keySection.append(keyHeader, keyList, warning);

    const navRow = document.createElement("div");
    navRow.className = "settings-nav";

    const navItems = [
        { label: "Audio", target: audioSection },
        { label: "Anzeige", target: screenSection },
        { label: "Steuerung", target: controlSection },
        { label: "Tasten", target: keySection },
    ];

    navItems.forEach((item) => {
        const button = createButton(item.label, () => {
            item.target.scrollIntoView({ behavior: "smooth", block: "start" });
        }, "ghost");
        navRow.append(button);
    });

    const content = document.createElement("div");
    content.className = "settings-content";

    content.append(audioSection, screenSection, controlSection, keySection);

    const buttonRow = document.createElement("div");
    buttonRow.className = "button-row";

    const defaultsButton = createButton("Defaults wiederherstellen", () => {
        currentBindings = { ...defaultSettings.keybindings };
        currentSettings = {
            ...currentSettings,
            audioEnabled: defaultSettings.audioEnabled,
            masterVolume: defaultSettings.masterVolume,
            keybindings: currentBindings,
            touchControls: defaultSettings.touchControls,
        };
        audioToggle.checked = currentSettings.audioEnabled;
        volumeSlider.value = Math.round(currentSettings.masterVolume * 100).toString();
        volumeValue.textContent = `${volumeSlider.value}%`;
        touchSelect.value = currentSettings.touchControls;
        callbacks.onUpdate(currentSettings);
        warning.textContent = "";
        captureAction = null;
        updateList();
    }, "secondary");

    const backButton = createButton("Zurueck", callbacks.onBack, "secondary");

    buttonRow.append(defaultsButton, backButton);

    card.append(title, navRow, content, buttonRow);
    screen.append(card);

    audioToggle.addEventListener("change", () => {
        currentSettings = {
            ...currentSettings,
            audioEnabled: audioToggle.checked,
            masterVolume: clamp(Number(volumeSlider.value) / 100, 0, 1),
            keybindings: currentBindings,
        };
        callbacks.onUpdate(currentSettings);
    });

    touchSelect.addEventListener("change", () => {
        currentSettings = {
            ...currentSettings,
            touchControls: touchSelect.value === "on" ? "on" : touchSelect.value === "off" ? "off" : "auto",
            keybindings: currentBindings,
        };
        callbacks.onUpdate(currentSettings);
    });

    volumeSlider.addEventListener("input", () => {
        const volume = clamp(Number(volumeSlider.value) / 100, 0, 1);
        volumeValue.textContent = `${Math.round(volume * 100)}%`;
        currentSettings = {
            ...currentSettings,
            audioEnabled: audioToggle.checked,
            masterVolume: volume,
            keybindings: currentBindings,
        };
        callbacks.onUpdate(currentSettings);
    });

    return {
        element: screen,
        dispose: () => {
            window.removeEventListener("keydown", handleKeydown);
        },
    };
};

const createButton = (label: string, onClick: () => void, variant?: "secondary" | "ghost"): HTMLButtonElement => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = variant ? `btn ${variant}` : "btn";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
};

const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};
