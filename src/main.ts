import "./style.css";
import { Game } from "./game/Game";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
    throw new Error("Container #app not found.");
}

const canvas = document.createElement("canvas");
canvas.id = "game-canvas";
app.appendChild(canvas);

const game = new Game(canvas);
game.start();
