import type { Settings } from "../types";
import type { Screen } from "./types";

type PauseCallbacks = {
    onResume: () => void;
    onRestart: () => void;
    onHome: () => void;
    onExit: () => void;
    onToggleAudio: () => void;
};

export type PauseOverlay = Screen & {
    setVisible: (visible: boolean) => void;
    setAudioState: (settings: Settings) => void;
};

export const createPauseOverlay = (settings: Settings, callbacks: PauseCallbacks): PauseOverlay => {
    const overlay = document.createElement("div");
    overlay.className = "overlay hidden";

    const panel = document.createElement("div");
    panel.className = "panel pause-panel";

    const title = document.createElement("h2");
    title.textContent = "Pause";

    const resumeButton = createButton("Weiter", callbacks.onResume);
    const restartButton = createButton("Neustart", callbacks.onRestart);
    const homeButton = createButton("Home", callbacks.onHome, "secondary");
    const exitButton = createButton("Exit", callbacks.onExit, "danger");

    const audioButton = createButton(settings.audioEnabled ? "Audio aus" : "Audio an", callbacks.onToggleAudio, "secondary");

    const buttonGroup = document.createElement("div");
    buttonGroup.className = "pause-actions";
    buttonGroup.append(resumeButton, restartButton, audioButton, exitButton, homeButton);

    panel.append(title, buttonGroup);
    overlay.append(panel);

    return {
        element: overlay,
        setVisible: (visible: boolean) => {
            overlay.classList.toggle("hidden", !visible);
        },
        setAudioState: (next: Settings) => {
            audioButton.textContent = next.audioEnabled ? "Audio aus" : "Audio an";
        },
    };
};

const createButton = (label: string, onClick: () => void, variant?: "secondary" | "danger"): HTMLButtonElement => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = variant ? `btn ${variant}` : "btn";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
};
