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
            return true;
        }

        event.preventDefault();

        const e = event as MouseEvent;
        initial = [e.clientX, e.clientY];

        document.addEventListener("mouseup", onUp);
        document.addEventListener("mousemove", onMove);
    });
}

export function buildDebugWindowHTML(
    id: string,
    colorsSpread: ColorSpread,
    sizeSpreadh: SizeSpread,
    css: string,
    less: string,
    logOutput: string[]
): string {
    const varsTable = document.createElement("table");
    varsTable.innerHTML = `<tr><th>Variable Name</th><th>Variable Value</th></tr>`;
    const varsTableBody = document.createElement("tbody");
    Object.entries(colorsSpread).forEach(([name, val]) => {
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
        <input type="checkbox">
        <h1>${id} DEBUG</h1>
        <h2>LESS VARIABLES</h2>
        ${varsTable.outerHTML}
        <h2>API</h2>
        <pre>${API}</pre>
        <h2>FINAL LESS</h2>
        <pre>${less}</pre>
        <h2>COMPILED CSS</h2>
        <pre>${css}</pre>
        <h2>LOG OUTPUT</h2>
        <pre>${logOutput.map((log) => `<code>${log}</code>`).join("")}</pre>
        `;
}
