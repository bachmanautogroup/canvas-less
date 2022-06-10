import { map, Observable, combineLatest, switchMap, shareReplay } from "rxjs";
import { render } from "less";

import { ControlInputObservables, OutputObservables } from "./params";
import { error, LogSubject } from "./debug";

export const CANVAS_DATA_CONTROL_NAME = "data-control-name";
export const CANVAS_DATA_CONTAINER_NAME = "data-container-name";
export const CANVAS_DATA_CONTROL_PART = "data-control-part";
const CANVAS_APP_SELECTOR = ".app-canvas";

const FILL_SELECTOR = ".appmagic-borderfill-container";

const INPUT_REPLACE_VAR = "%%input%%";

const CANVAS_LESS = `
// LessCanvas styles

${CANVAS_APP_SELECTOR} {

    .control(@name, @rule, @fillRule: {}) {
        @_controlDataAttribute: ${CANVAS_DATA_CONTROL_NAME};
        @controlSelector: %(~'[%s=%s]', @_controlDataAttribute, %('%s', @name));
    
        & @{controlSelector} {
            @rule();
            
            & > div > ${FILL_SELECTOR}, & > ${FILL_SELECTOR} {
                @fillRule()
            }
        }
    }
    
    .container(@name, @rule, @fillRule: {}) {
        @_containerDataAttribute: ${CANVAS_DATA_CONTAINER_NAME};
        @containerSelector: %(~'[%s=%s]', @_containerDataAttribute, %('%s-container', @name));
    
        & @{containerSelector} {
            @rule();
            
            & > div > ${FILL_SELECTOR}, & > ${FILL_SELECTOR} {
                @fillRule()
            }
        }
    }
    
    .part(@partName, @rule, @fillRule: {}) {
        @_partDataAttribute: ${CANVAS_DATA_CONTROL_PART};
        @partSelector: %(~'[%s=%s]', @_partDataAttribute, %('%s', @partName));
    
        & @{partSelector} {
            @rule()
            
            & > div > ${FILL_SELECTOR}, & > ${FILL_SELECTOR} {
                @fillRule()
            }
        }
    }
    
    // user styles begin
    ${INPUT_REPLACE_VAR}
    // user styles end
    
}
`;

function placeInputLess(input: string): string {
    return CANVAS_LESS.replace(INPUT_REPLACE_VAR, input);
}

export function buildLess(input: ControlInputObservables): Observable<string> {
    return input.style.pipe(map((i) => placeInputLess(i)));
}

export function buildCSS(
    depends: Omit<OutputObservables, "css">,
    log: LogSubject
): Observable<string> {
    // not deprecated - using object implementation
    // noinspection JSDeprecatedSymbols
    return combineLatest<Omit<OutputObservables, "css">>(depends).pipe(
        switchMap(async (dep) => {
            const { less, ...vars } = dep;
            const stringSizes: Record<string, string> = {};
            for (const [k, v] of Object.entries(vars.sizes)) {
                stringSizes[k] = `${v.toFixed(2)}em`;
            }

            const globalVars = { ...vars.colors, ...stringSizes };
            try {
                return (await render(less, { globalVars })).css;
            } catch (e) {
                error(log, e as Error);
                return "";
            }
        }),
        shareReplay(1)
    );
}
