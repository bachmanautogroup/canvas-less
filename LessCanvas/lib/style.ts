import {render} from "less";
import {ColorSpread} from "./color";
import {SizeSpread} from "./size";
import {IOutputs} from "../generated/ManifestTypes";

export type LessVariables = Omit<IOutputs, "css" | "less"> extends infer O
    ? Record<keyof O, string>
    : never;

export const CANVAS_DATA_CONTROL_NAME = "data-control-name";
export const CANVAS_DATA_CONTAINER_NAME = "data-container-name";
export const CANVAS_DATA_CONTROL_PART = "data-control-part";

const FILL_SELECTOR = ".appmagic-borderfill-container";
export const CANVAS_APP_SELECTOR = ".app-canvas";

const INPUT_REPLACE_VAR = "%%input%%";
const UPDATE_TIME_VAR = "%%updated%%";

const CANVAS_LESS = `
// LessCanvas styles
// refreshed: ${UPDATE_TIME_VAR}

${CANVAS_APP_SELECTOR} {

    .control(@name, @rule, @fillRule: {}) {
        @_controlDataAttribute: ${CANVAS_DATA_CONTROL_NAME};
        @controlSelector: %(~'[%s=%s]', @_controlDataAttribute, %('%s', @name));
    
        & @{controlSelector} {
            @rule()
        }
        
        & > div > ${FILL_SELECTOR}, & > ${FILL_SELECTOR} {
            @fillRule()
        }
    }
    
    .container(@name, @rule, @fillRule: {}) {
        @_containerDataAttribute: ${CANVAS_DATA_CONTAINER_NAME};
        @containerSelector: %(~'[%s=%s]', @_containerDataAttribute, %('%s-container', @name));
    
        & @{containerSelector} {
            @rule()
        }
        
        & > div > ${FILL_SELECTOR}, & > ${FILL_SELECTOR} {
            @fillRule()
        }
    }
    
    .part(@partName, @rule, @fillRule: {}) {
        @_partDataAttribute: ${CANVAS_DATA_CONTROL_PART};
        @partSelector: %(~'[%s=%s]', @_partDataAttribute, %('%s', @partName));
    
        & @{partSelector} {
            @rule()
        }
        
        & > div > ${FILL_SELECTOR}, & > ${FILL_SELECTOR} {
            @fillRule()
        }
    }
    
    // user styles begin
    
    ${INPUT_REPLACE_VAR}
    
    // user styles end
    
}
`;

export function lessVars(colors: ColorSpread, sizes: SizeSpread): LessVariables {
    const vars: Record<string, string> = {...colors};
    Object.entries(sizes).forEach(([size, val]) => {
        vars[size] = `${val.toFixed(2)}em`;
    });

    return vars;
}

export function joinedLess(inputLess: string): string {
    return CANVAS_LESS
        .replace(INPUT_REPLACE_VAR, inputLess)
        .replace(
            UPDATE_TIME_VAR,
            new Date().toISOString()
        );
}

export async function compileCss(less: string, vars: LessVariables) {
    return (await render(less, {globalVars: vars})).css;
}

function getStyleElement(id: string): HTMLStyleElement {
    return (document.querySelector(`#${id}`) ||
        document.createElement("style")) as HTMLStyleElement;
}

export function createStyleElement(style: string, id: string): void {
    const tag = getStyleElement(id)

    if (!tag.parentElement) {
        tag.id = id;
        document.head.appendChild(tag)
    }

    tag.innerHTML = style
}

export function removeStyleElement(id: string): void {
    getStyleElement(id).remove()
}