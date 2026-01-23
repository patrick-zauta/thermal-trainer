import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
    throw new Error("Container #app wurde nicht gefunden.");
}

app.innerHTML = `
  <div class="card">
    <h1>Paragliding Thermal Trainer</h1>
    <p>Testseite für Setup, Build und Deploy Pipeline.</p>
  </div>
`;
