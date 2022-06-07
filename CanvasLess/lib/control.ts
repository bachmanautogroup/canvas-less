import {CANVAS_APP_SELECTOR} from "./style";
import {SizeSpread} from "./size";
import {ColorSpread} from "./color";
import {lab} from "chroma-js";

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


function debugLogSection(output: string[]): HTMLElement {
    const section = document.createElement("section")
    section.classList.add("debug-less-section")
    section.innerHTML = `<h2>Output Log</h2><pre>${output.join("\n")}</pre>`
    return section
}

const DEPTH_INDENT = 2;

function label(el: Element, depth: number): string {
    const indent = " ".repeat(DEPTH_INDENT).repeat(depth)
    const id = el.id ? `#${el.id}` : "";
    const classes = el.classList.length ? `.${el.classList.toString()}` : "";

    return `${indent} &lt;${el.tagName}&gt; ${id} ${classes}\n`
}

function buildDomString(node: Element = document.body, domString: string = "", depth: number = 0): string {
    for (let i = 0; i < node.children.length; i++) {
        const el = node.children[i];
        domString += buildDomString(el, label(el, depth), depth + 1)
    }

    return domString
}

function debugDOMStringSection(domString: string): HTMLElement {
    const section = document.createElement("section")
    section.classList.add("debug-domstring-section")
    section.innerHTML = `<h2>DOM String</h2><pre>${domString}</pre>`
    return section
}

export function buildControlHTML(
    id: string,
    colorSpread: ColorSpread,
    sizeSpread: SizeSpread,
    css: string,
    less: string,
    logOutput: string[]
): string {
    return `
        <h1>${id}</h1>
        ${debugCssSection(css).outerHTML}
        ${debugLessSection(less).outerHTML}
        ${debugColorsSection(colorSpread).outerHTML}
        ${debugSizeSection(sizeSpread).outerHTML}
        ${debugDOMStringSection(buildDomString()).outerHTML}
        ${debugLogSection(logOutput).outerHTML}
        `
}
