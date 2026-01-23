import "./style.css";
import { Game } from "./game/Game";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
    throw new Error("Container #app not found.");
}

const canvas = document.createElement("canvas");
canvas.id = "game-canvas";

const controls = document.createElement("div");
controls.id = "hud-controls";
const label = document.createElement("label");
label.textContent = "Speed";
const select = document.createElement("select");
select.id = "speed-select";
label.htmlFor = select.id;

const speedOptions = [
    { label: "1x", value: "1" },
    { label: "2x", value: "2" },
    { label: "3x", value: "3" },
    { label: "5x", value: "5" },
    { label: "10x", value: "10" },
];
for (const option of speedOptions) {
    const entry = document.createElement("option");
    entry.value = option.value;
    entry.textContent = option.label;
    select.appendChild(entry);
}
select.value = "1";

controls.append(label, select);
app.replaceChildren(canvas, controls);

const game = new Game(canvas);
select.addEventListener("change", () => {
    game.setTimeScale(Number(select.value));
});
game.start();
