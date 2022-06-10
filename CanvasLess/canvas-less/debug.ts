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

function debugLessSection(less: string): HTMLElement {
    const section = document.createElement("section");
    section.classList.add("debug-less-section");
    section.innerHTML = `<h2>Final Less</h2><pre>${less}</pre>`;
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
        <p>CanvasLess debug window. Toggle <code>Show Debug</code> to <code>False</code> to hide.</p>
        ${debugCssSection(css).outerHTML}
        ${debugColorsSection(colorSpread).outerHTML}
        ${debugSizeSection(sizeSpread).outerHTML}
        ${debugAPISection().outerHTML}
        ${debugLessSection(less).outerHTML}
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
