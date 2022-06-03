import { Color, hex } from "chroma-js";
import { render } from "less";

const COLOR_SPREAD_CT = 9;
const COLOR_DOMAINS = [
    "Primary",
    "Secondary",
    "Tertiary",
    "Neutral",
    "Info",
    "Success",
    "Warning",
    "Danger",
] as const;

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

type Digit = typeof DIGITS[number];

type ColorSet = typeof COLOR_DOMAINS[number];
export type ColorHex = `#${string}`;

export interface SetSpreadConfig {
    mid: ColorHex;
    n1: number;
    n2: number;
}

export type SpreadConfig = Record<ColorSet, SetSpreadConfig>;
export type ColorKey<D extends ColorSet = ColorSet> = `color${D}${Digit}00`;
export type ColorSpread = Record<ColorKey, string>;
type ColorSetSpread<D extends ColorSet = ColorSet> = Pick<
    ColorSpread,
    ColorKey<D>
>;

function translateColor(
    colorPosition: number,
    midColor: Color,
    n1: number,
    n2: number
): string {
    const normalized =
        2 * ((colorPosition - COLOR_SPREAD_CT) / (1 - COLOR_SPREAD_CT)) - 1;
    const adjustment = Math.abs(
        Math.sin((Math.PI / 2) * Math.pow(normalized, n1)) * n2
    );
    const midSaturation = midColor.hsl()[1];

    const midColorPosition = Math.ceil(COLOR_SPREAD_CT / 2);

    if (colorPosition !== midColorPosition) {
        if (colorPosition < midColorPosition) {
            return midColor
                .darken(adjustment)
                .saturate(adjustment * midSaturation)
                .hex("rgb");
        } else {
            return midColor
                .brighten(adjustment)
                .desaturate(adjustment * midSaturation)
                .hex("rgb");
        }
    }
    return midColor.hex("rgb");
}

function spreadDomain(
    domain: ColorSet,
    midColor: ColorHex,
    n1: number,
    n2: number
): ColorSetSpread {
    const color = hex(midColor);

    const spread: Partial<ColorSetSpread> = {};
    for (let i = 1; i <= COLOR_SPREAD_CT; i++) {
        const valueDigit = i.toString(10) as Digit;
        const title: ColorKey = `color${domain}${valueDigit}00`;
        spread[title] = translateColor(i, color, n1, n2);
    }

    return spread as ColorSetSpread<typeof domain>;
}

export function spreadColors(seed: SpreadConfig): ColorSpread {
    const spread: Partial<ColorSpread> = {};

    for (const [domain, config] of Object.entries(seed)) {
        Object.assign(
            spread,
            spreadDomain(domain as ColorSet, config.mid, config.n1, config.n2)
        );
    }

    return spread as ColorSpread;
}

export type SizeKey = `gridSize${Digit}00`;

export type SizeSpread = Record<SizeKey, number>;

const GRID_SPREAD_CT = 9;

function subdivideGridSize(pos: number, midSize: number): number {
    const normalized = (2 * pos) / GRID_SPREAD_CT;
    const midPos = Math.ceil(GRID_SPREAD_CT / 2);

    if (pos !== midPos) {
        return Math.pow(2, normalized) - midSize;
    }

    return midSize;
}

export function spreadSizes(midGridSize: number): SizeSpread {
    const spread: Partial<SizeSpread> = {};

    for (let i = 1; i <= GRID_SPREAD_CT; i++) {
        const valueDigit = i.toString(10) as Digit;
        const title: SizeKey = `gridSize${valueDigit}00`;

        spread[title] = subdivideGridSize(i, midGridSize);
    }

    return spread as SizeSpread;
}

export const CANVAS_DATA_CONTROL_NAME = "data-control-name";
export const CANVAS_DATA_CONTAINER_NAME = "data-container-name";
export const CANVAS_DATA_CONTROL_PART = "data-control-part";

const FILL_SELECTOR = ".appmagic-borderfill-container";
export const CANVAS_APP_SELECTOR = ".app-canvas";

const USER_REPLACE_VAR = "%%input%%";
const UPDATE_TIME_VAR = "%%updated%%";

const CANVAS_LESS = `
// LessCanvas styles
// updated: ${UPDATE_TIME_VAR}

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
    
    ${USER_REPLACE_VAR}
    
}
`;

export function styleVariables(
    colorSpread: ColorSpread,
    sizeSpread: SizeSpread
): Record<string, string> {
    const vars: Record<string, string> = { ...colorSpread };
    Object.entries(sizeSpread).forEach(([size, val]) => {
        vars[size] = `${val.toFixed(2)}em`;
    });

    return vars;
}

export async function compileStyle(
    inputStyle: string,
    vars: Record<string, string>,
    joinedCallback?: (joined: string) => void
): Promise<string> {
    const joined = CANVAS_LESS.replace(USER_REPLACE_VAR, inputStyle).replace(
        UPDATE_TIME_VAR,
        new Date().toISOString()
    );
    joinedCallback?.(joined);

    return (await render(joined, { globalVars: vars })).css;
}
