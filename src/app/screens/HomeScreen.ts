import type { Screen } from "./types";

type HomeScreenCallbacks = {
    onStart: () => void;
    onSettings: () => void;
};

export const createHomeScreen = (callbacks: HomeScreenCallbacks): Screen => {
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

    const buttonRow = document.createElement("div");
    buttonRow.className = "button-row";

    const startButton = createButton("Start", callbacks.onStart);
    const settingsButton = createButton("Einstellungen", callbacks.onSettings, "secondary");

    buttonRow.append(startButton, settingsButton);
    card.append(title, description, author, buttonRow);
    screen.append(card);

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
