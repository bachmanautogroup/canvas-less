import { CANVAS_APP_SELECTOR, ColorSpread, SizeSpread } from "./style";

const API = `
<code>
.control([ControlName], [rule], [fillRule])
.container([ControlName], [rule], [fillRule])
.part([PartName], [rule], [fillRule]) 
</code>

where [rule] and [fillRule] are CSS rulesets <strong>enclosed in brackets</strong>

Rulesets in the [rule] param are nested into the Control's root HTML element. 
[fillRule] is provided for applying rulesets to the controls 'borderfill-container', to which customizations added in Canvas like fill and borderStyle are applied.
Nest these as necessary for specific hierarchies.

For example:

<code>
.control(SearchInput, {
    cursor: pointer;
}, {
    background-color: red;
})
</code>
`;

function log(msg: string, type: string, logTo: string[]): void {
    const logString = `STYLE_MANAGER - ${new Date().toISOString()} :: ${type} :: ${msg}`;
    logTo.push(logString);
}

export function error(e: Error, logTo: string[]): void {
    return log(`${e.message} \n ${e}`, "ERROR", logTo);
}

export function debug(msg: string, logTo: string[]): void {
    return log(msg, "debug", logTo);
}

function domTreeString(treeString: string, indent: number): string {
    return "";
}

export function buildDomString(): string {
    const root = document.querySelector(CANVAS_APP_SELECTOR);

    return "";
}

export function makeDraggable(el: HTMLDivElement): void {
    let initial: [number, number] = [el.clientLeft, el.clientTop];

    const onMove = (event: Event) => {
        event.preventDefault();

        const e = event as MouseEvent;
        const newPosition: [number, number] = [
            initial[0] - e.clientX,
            initial[1] - e.clientY,
        ];
        initial = [e.clientX, e.clientY];

        el.style.left = `${el.offsetLeft - newPosition[0]}px`;
        el.style.top = `${el.offsetTop - newPosition[1]}px`;
    };

    const onUp = () => {
        document.removeEventListener("mouseup", onUp);
        document.removeEventListener("mousemove", onMove);
    };

    el.addEventListener("mousedown", (event: Event) => {
        if (event.target !== el) {
            return;
        }

        event.preventDefault();

        const e = event as MouseEvent;
        initial = [e.clientX, e.clientY];

        document.addEventListener("mouseup", onUp);
        document.addEventListener("mousemove", onMove);
    });
}


function debugColorsSection(colorSpread: ColorSpread): HTMLElement {
    const rows = Object.entries(colorSpread).map(([n, v]) => `<tr><td>${n}</td><td><code>${v}</code></td><td style="background-color: ${v}"></td></tr>`).join("")
    const inner = `<h2>Color Variables</h2><table><thead><tr><th>Name</th><th>Color Hex</th><th>Swatch</th></tr></thead><tbody>${rows}</tbody></table>`

    const section = document.createElement("section")
    section.classList.add("debug-color-section")
    section.innerHTML = inner
    return section
}

function debugSizeSection(sizeSpread: SizeSpread): HTMLElement {
    const rows = Object.entries(sizeSpread).map(([n, v]) => `<tr><td>${n}</td><td><code>${v.toFixed(2)}em</code></td><td><div style="min-width: ${v}em"></div></td></tr>`).join("")
    const inner = `<h2>Size Variables</h2><table><thead><tr><th>Size</th><th>Em Multiple</th><th>Width</th></tr></thead><tbody>${rows}</tbody></table>`

    const section = document.createElement("section")
    section.classList.add("debug-size-section")
    section.innerHTML = inner
    return section
}

function debugCssSection(css: string): HTMLElement {
    const section = document.createElement("section")
    section.classList.add("debug-css-section")
    section.innerHTML = `<h2>Compiled CSS</h2><pre>${css}</pre>`
    return section
}


function debugLessSection(less: string): HTMLElement {
 const section = document.createElement("section")
    section.classList.add("debug-less-section")
    section.innerHTML = `<h2>Final Less</h2><pre>${less}</pre>`
    return section
}

//
// function logOutput(output: string[]): HTMLElement {
//
// }

export function buildDebugWindowHTML(
    id: string,
    colorSpread: ColorSpread,
    sizeSpread: SizeSpread,
    css: string,
    less: string,
    logOutput: string[]
): string {
    const varsTable = document.createElement("table");
    varsTable.innerHTML = `<tr><th>Variable Name</th><th>Variable Value</th></tr>`;
    const varsTableBody = document.createElement("tbody");
    Object.entries(colorSpread).forEach(([name, val]) => {
        const tr = document.createElement("tr");
        const tdName = document.createElement("td");
        tdName.innerText = name;
        tr.appendChild(tdName);

        const tdVal = document.createElement("td");
        tdVal.innerText = val;
        tr.appendChild(tdVal);

        tdVal.style.backgroundColor = val;

        varsTableBody.appendChild(tr);
    });

    varsTable.appendChild(varsTableBody);

    return `
        <h1>${id}</h1>
        <p>Debug Window</p>
        ${debugColorsSection(colorSpread).outerHTML}
        ${debugSizeSection(sizeSpread).outerHTML}
        ${debugLessSection(less).outerHTML}
        ${debugCssSection(css).outerHTML}
        `
}
