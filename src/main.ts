import "./style.css";
import { App } from "./app/App";

const appRoot = document.querySelector<HTMLDivElement>("#app");
if (!appRoot) {
    throw new Error("Container #app not found.");
}

const app = new App(appRoot);
app.start();
