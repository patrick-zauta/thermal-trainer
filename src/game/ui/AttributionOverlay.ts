export const createAttributionOverlay = (text: string): HTMLDivElement => {
    const element = document.createElement("div");
    element.className = "attribution";
    element.textContent = text;
    return element;
};
