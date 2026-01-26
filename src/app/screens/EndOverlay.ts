import type { Screen } from "./types";

type EndState = "winner" | "gameover";

type EndCallbacks = {
    onContinue: () => void;
};

export type EndOverlay = Screen & {
    setVisible: (visible: boolean, state?: EndState) => void;
};

export const createEndOverlay = (callbacks: EndCallbacks): EndOverlay => {
    const overlay = document.createElement("div");
    overlay.className = "overlay hidden";

    const panel = document.createElement("div");
    panel.className = "panel pause-panel";

    const title = document.createElement("h2");
    title.textContent = "Run beendet";

    const description = document.createElement("p");
    description.className = "muted";
    description.textContent = "Der Lauf ist beendet.";

    const continueButton = createButton("Zur Uebersicht", callbacks.onContinue);

    const buttonGroup = document.createElement("div");
    buttonGroup.className = "pause-actions";
    buttonGroup.append(continueButton);

    panel.append(title, description, buttonGroup);
    overlay.append(panel);

    const setVisible = (visible: boolean, state?: EndState): void => {
        overlay.classList.toggle("hidden", !visible);
        if (state === "winner") {
            title.textContent = "Gewonnen";
            description.textContent = "Ziel erreicht. Gute Arbeit.";
        } else if (state === "gameover") {
            title.textContent = "Game Over";
            description.textContent = "Hoehe ist auf 0 m gefallen.";
        } else {
            title.textContent = "Run beendet";
            description.textContent = "Der Lauf ist beendet.";
        }
    };

    return {
        element: overlay,
        setVisible,
    };
};

const createButton = (label: string, onClick: () => void): HTMLButtonElement => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
};
