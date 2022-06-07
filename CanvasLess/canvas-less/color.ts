import { map, Observable, combineLatest, auditTime } from "rxjs";
import { Color, hex }                                from "chroma-js";

import { ControlInputObservables } from "./params";
import { ObservedObject } from "./util";

type ObservableColorInputs = Omit<
    ControlInputObservables,
    "style" | "keepStyle" | "sizeEmGridMult" | "sizeEmGridSeed" | "showDebug"
>;

const COLOR_SPREAD_CT = 9;
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
const ERROR_COLOR_HEX = "#FF69B4";

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

type HexString = `#${string}`;

type Domain = typeof COLOR_DOMAINS[number];
type OutputColorKey<D extends Domain = Domain> = `color${D}${number}`;

export type ColorSpread = Record<OutputColorKey, string>;

function translateColor(
    middle: Color,
    saturate: number,
    brighten: number
): Color {
    return middle.saturate(saturate).brighten(brighten);
}

function spreadColor(
    colorString: string,
    domain: Domain,
    ease: number,
    magnitude: number
): Record<OutputColorKey, string> {
    const hexString = colorString.match(HEX_COLOR_PATTERN)
        ? (colorString as HexString)
        : ERROR_COLOR_HEX;

    const middle = hex(hexString);
    // const middleHue = middle.hsl()[0];
    const middleSat = middle.hsl()[1];
    const middleLum = middle.hsl()[2];

    const spread: Partial<Record<OutputColorKey, string>> = {};

    // start at 1 to make curving easier
    for (let i = 1; i <= COLOR_SPREAD_CT; i++) {
        const normalized =
            2 * ((i - COLOR_SPREAD_CT) / (1 - COLOR_SPREAD_CT)) - 1;
        const curveValue = ease * Math.pow(normalized * magnitude, 3);

        const saturate = middleSat * curveValue;
        const brighten = middleLum / curveValue;

        const label: OutputColorKey = `color${domain}${i * 100}`;
        spread[label] = translateColor(middle, saturate, brighten).hex();
    }

    return spread as Record<OutputColorKey, string>;
}

function spreadColors(
    colors: ObservedObject<ObservableColorInputs>
): ColorSpread {
    let spread: Partial<ColorSpread> = {};
    for (const domain of COLOR_DOMAINS) {
        const color = colors[`color${domain}Seed`];
        const ease = colors[`color${domain}Ease`];
        const magnitude = colors[`color${domain}Magnitude`];

        spread = Object.assign(
            spread,
            spreadColor(color, domain, ease, magnitude)
        );
    }

    return spread as ColorSpread;
}

export function buildColors(
    input: ControlInputObservables
): Observable<ColorSpread> {
    // adjust so we get keys with observed values
    const {
        // eslint-disable-next-line no-unused-vars
        style,
        // eslint-disable-next-line no-unused-vars
        keepStyle,
        // eslint-disable-next-line no-unused-vars
        sizeEmGridMult,
        // eslint-disable-next-line no-unused-vars
        showDebug,
        // eslint-disable-next-line no-unused-vars
        sizeEmGridSeed,
        ...observed
    } = input;

    // not deprecated - using object implementation
    // noinspection JSDeprecatedSymbols
    return combineLatest(observed).pipe(
        map((colors: ObservedObject<ObservableColorInputs>) => {
            return spreadColors(colors);
        })
    );
}
