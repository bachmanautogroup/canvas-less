import {
    combineLatest,
    Observable,
    ReplaySubject,
    scan,
    Subscription,
} from "rxjs";
import { ColorSpread } from "./color";
import { SizeSpread } from "./size";
import { OutputObservables } from "./params";
import { ObservedObject } from "./util";
import {
    CANVAS_DATA_CONTAINER_NAME,
    CANVAS_DATA_CONTROL_NAME,
    CANVAS_DATA_CONTROL_PART,
} from "./style";

export type LogSubject = ReplaySubject<string>;

const API = `
<code>
.control(@ControlName, @rule, @fillRule)
</code>

@ControlName: string label of the control in the canvas editor
@rule: less ruleset to be applied within the scope of the control.
@fillRule: less ruleset to be applied to the fill container of the control (provided for convenience; optional)

Used to apply styles to canvas controls.

<code>
ex: 
.control(SearchLayout, 
{
    color: red;
    font-style: italic;
}, 
{
    background-color: white;
    border-radius: 4px;
});
</code>

<code>
.container(@ControlName, @rule, @fillRule)
</code>

@ControlName: string label of the control in the canvas editor
@rule: less ruleset to be applied within the scope of the control's container div.
@fillRule: less ruleset to be applied to the fill container of the control's container (provided for convenience; optional)

<code>
.part(@PartName, @rule, @fillRule)
</code>

@PartName: string label of the part type. eg., text, gallery-item 
@rule: less ruleset to be applied within the scope of the control's container div.
@fillRule: less ruleset to be applied to the fill container of the control's container (provided for convenience; optional)


For easier design iteration, download overrides.less and customize and compile to CSS locally. 
Then, use Chrome DevTools local overrides to replace the overrides.css with the local output. 
Chrome will watch this file and automatically reflect changes as they occur.
`;

const DEPTH_INDENT = 2;

function label(el: Element, depth: number): string {
    const indent = " ".repeat(DEPTH_INDENT).repeat(depth);
    const id = el.id ? `id: ${el.id}` : "";
    const classes = el.classList.length
        ? `classes: ${el.classList.toString()}`
        : "";
    const canvasData = [
        CANVAS_DATA_CONTROL_NAME,
        CANVAS_DATA_CONTAINER_NAME,
        CANVAS_DATA_CONTROL_PART,
    ]
        .map((m) => el.getAttribute(m))
        .filter((s) => s)
        .join(",");
    const data = canvasData.length ? `data: (${canvasData})` : "";
    const label = [id, classes, data].filter((s) => s).join(" ; ");

    return `${indent} &lt;${el.tagName.toLowerCase()}&gt; ${label}\n`;
}

export function buildDomString(
    node: Element = document.body,
    domString: string = "",
    depth: number = 0
): string {
    for (let i = 0; i < node.children.length; i++) {
        const el = node.children[i];
        domString += buildDomString(el, label(el, depth), depth + 1);
    }

    return domString;
}

function debugColorsSection(colorSpread: ColorSpread): HTMLElement {
    const rows = Object.entries(colorSpread)
        .map(
            ([n, v]) =>
                `<tr><td>${n}</td><td><code>${v}</code></td><td style="background-color: ${v}"></td></tr>`
        )
        .join("");
    const inner = `<h2>Color Variables</h2><table><thead><tr><th>Name</th><th>Color Hex</th><th>Swatch</th></tr></thead><tbody>${rows}</tbody></table>`;

    const section = document.createElement("section");
    section.classList.add("debug-color-section");
    section.innerHTML = inner;
    return section;
}

function debugSizeSection(sizeSpread: SizeSpread): HTMLElement {
    const rows = Object.entries(sizeSpread)
        .map(
            ([n, v]) =>
                `<tr><td>${n}</td><td><code>${v.toFixed(
                    2
                )}em</code></td><td><div style="min-width: ${
                    v.toFixed(2) + "em"
                }"></div></td></tr>`
        )
        .join("");
    const inner = `<h2>Size Variables</h2><table><thead><tr><th>Size</th><th>Em Multiple</th><th>Width</th></tr></thead><tbody>${rows}</tbody></table>`;

    const section = document.createElement("section");
    section.classList.add("debug-size-section");
    section.innerHTML = inner;
    return section;
}

function debugCssSection(css: string): HTMLElement {
    const section = document.createElement("section");
    section.classList.add("debug-css-section");
    section.innerHTML = `<h2>Compiled CSS</h2><pre>${css}</pre>`;
    return section;
}

function colorSpreadVarsString(spread: ColorSpread): string {
    return Object.entries(spread)
        .map(([k, v]) => `@${k}: ${v};`)
        .join("\n");
}

function sizeSpreadVarsString(spread: SizeSpread): string {
    return Object.entries(spread)
        .map(([k, v]) => `@${k}: ${v.toFixed(2)}em;`)
        .join("\n");
}

function debugLessSection(
    less: string,
    colors: ColorSpread,
    sizes: SizeSpread
): HTMLElement {
    const section = document.createElement("section");
    section.classList.add("debug-less-section");

    const overrides = [
        colorSpreadVarsString(colors),
        sizeSpreadVarsString(sizes),
        less,
    ].join("\n");
    const encoded = btoa(overrides);
    const href = `data:text/less;base64,${encoded}`;
    section.innerHTML = `<h2>Final Less</h2>
        <a href="${href}" target="_blank" download="overrides.less">overrides.less</a>
        <pre>${overrides}</pre>`;
    return section;
}

function debugLogSection(output: string[]): HTMLElement {
    const logs = output
        .map(
            (l) =>
                `<pre class="${
                    l.includes("::ERROR::") ? "error-log" : ""
                }"><a data-logged="${l}">all</a>${logTrunc(
                    l,
                    LOG_MSG_LEN_MAX
                )}</pre>`
        )
        .join("");

    const section = document.createElement("section");
    section.classList.add("debug-log-section");
    section.innerHTML = `<h2>Output Log</h2>${logs}`;
    return section;
}

function debugAPISection(): HTMLElement {
    const section = document.createElement("section");
    section.classList.add("debug-api-section");
    section.innerHTML = `<h2>API</h2><pre>${API}</pre>`;
    return section;
}

function debugDOMStringSection(domString: string): HTMLElement {
    const section = document.createElement("section");
    section.classList.add("debug-domstring-section");
    section.innerHTML = `<h2>DOM String</h2><pre>${domString}</pre>`;
    return section;
}

function debugHTML(
    colorSpread: ColorSpread,
    sizeSpread: SizeSpread,
    css: string,
    less: string,
    logOutput: string[],
    domString: string
): string {
    return `
        <link rel="stylesheet" type="text/less" src="./styles/overrides.less">
        <p>CanvasLess debug window. Toggle <code>Show Debug</code> to <code>False</code> to hide.</p>
        ${debugCssSection(css).outerHTML}
        ${debugColorsSection(colorSpread).outerHTML}
        ${debugSizeSection(sizeSpread).outerHTML}
        ${debugAPISection().outerHTML}
        ${debugLessSection(less, colorSpread, sizeSpread).outerHTML}
        ${debugLogSection(logOutput).outerHTML},
        ${debugDOMStringSection(domString).outerHTML}
        `;
}

type ObservedOutput = ObservedObject<OutputObservables>;

export function subscribeDebug(
    containerId: string,
    container: HTMLDivElement,
    outputs: OutputObservables,
    size: ContainerSizeSubject,
    showDebug: Observable<boolean>,
    log: LogSubject
): Subscription {
    container.id = containerId;
    const domString = buildDomString();

    const scannedLog = log.pipe(
        scan((acc, val) => {
            return [...acc, val];
        }, [] as string[])
    );

    // not deprecated - using object implementation
    // noinspection JSDeprecatedSymbols
    const observedOutputs: Observable<ObservedOutput> = combineLatest(outputs);
    const observed = combineLatest([
        showDebug,
        size,
        observedOutputs,
        scannedLog,
    ]);

    return observed.subscribe({
        next: ([show, size, outputs, logged]) => {
            if (!show) {
                container.innerHTML = "";
                return;
            }
            setContainerSize(container, size);
            container.innerHTML = debugHTML(
                outputs.colors,
                outputs.sizes,
                outputs.css,
                outputs.less,
                logged,
                domString
            );
        },
    });
}

function setContainerSize(
    container: HTMLDivElement,
    [width, height]: [number, number]
): void {
    container.style.maxWidth = `${width}px`;
    container.style.maxHeight = `${height}px`;
}

export type ContainerSizeSubject = ReplaySubject<[number, number]>;

export function sizeSubject(): ContainerSizeSubject {
    return new ReplaySubject<[number, number]>(1);
}

export function sizeUpdate(
    width: number,
    height: number,
    sizeSubject: ContainerSizeSubject
): void {
    return sizeSubject.next([width, height]);
}

export function logSubject(logToConsole: boolean): LogSubject {
    const subject = new ReplaySubject<string>(1);

    if (logToConsole) {
        subject.subscribe((l) => console.log(l));
    }

    return subject;
}

function logTrunc(value: any, len: number): string {
    let str = String(value);
    if (str.length > len) {
        str = str.slice(0, len) + "...";
    }

    return str.replace(/[^\S ]/g, "");
}

const LOG_MSG_LEN_MAX = 96;

function log(subject: LogSubject, type: string, msg: string): void {
    const str = `${new Date().toISOString()} :: ${type} :: ${msg}`;
    return subject.next(str);
}

export function error(subject: LogSubject, e: Error): void {
    return log(subject, "ERROR", `${e.message} \n ${e}`);
}

export function debug(subject: LogSubject, msg: string): void {
    return log(subject, "DEBUG", msg);
}
