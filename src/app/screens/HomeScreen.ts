import type { Screen } from "./types";
import type { Settings } from "../types";

type HomeScreenCallbacks = {
    onStart: () => void;
    onChallenges: () => void;
    onSettings: () => void;
    onToggleAudio: (enabled: boolean) => void;
};

export const createHomeScreen = (settings: Settings, callbacks: HomeScreenCallbacks): Screen => {
    const screen = document.createElement("div");
    screen.className = "screen screen-home";

    const card = document.createElement("div");
    card.className = "panel card";

    const title = document.createElement("h1");
    title.textContent = "Paragliding Thermal Trainer";

    const description = document.createElement("p");
    description.textContent = "Trainiere Thermik finden und zentrieren in einer 2D Ansicht.";

    const author = document.createElement("p");
    author.className = "muted";
    author.textContent = "von Patrick Zauta";

    const audioRow = document.createElement("div");
    audioRow.className = "row";

    const audioLabel = document.createElement("span");
    audioLabel.textContent = "Audio aktiv";

    const audioToggle = document.createElement("input");
    audioToggle.type = "checkbox";
    audioToggle.checked = settings.audioEnabled;

    audioRow.append(audioLabel, audioToggle);

    const buttonRow = document.createElement("div");
    buttonRow.className = "button-row";

    const startButton = createButton("Start", callbacks.onStart);
    const challengesButton = createButton("Challenges", callbacks.onChallenges, "secondary");
    const settingsButton = createButton("Einstellungen", callbacks.onSettings, "secondary");

    buttonRow.append(startButton, challengesButton, settingsButton);
    card.append(title, description, author, audioRow, buttonRow);
    screen.append(card);

    audioToggle.addEventListener("change", () => {
        callbacks.onToggleAudio(audioToggle.checked);
    });

    return { element: screen };
};

const createButton = (label: string, onClick: () => void, variant?: "secondary"): HTMLButtonElement => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = variant ? `btn ${variant}` : "btn";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
};
