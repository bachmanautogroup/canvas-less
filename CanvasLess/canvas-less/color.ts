import { map, Observable, combineLatest } from "rxjs";
import { hex, Scale, scale } from "chroma-js";

import { ControlInputObservables } from "./params";
import { ObservedObject } from "./util";

type ObservableColorInputs = Omit<
    ControlInputObservables,
    "style" | "keepStyle" | "sizeEmGridMult" | "sizeEmGridSeed" | "showDebug"
>;

const COLOR_CT = 9;
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

function colorScale(hexString: string, ease: number, magnitude: number): Scale {
    const middle = hex(hexString);

    const middleLum = middle.luminance();
    const lumHead = 1 - middleLum;

    const magRange = magnitude / 1000;
    const brightest = middle.luminance(middleLum + lumHead * magRange);
    const darkest = middle.luminance(middleLum - middleLum * magRange);

    const easeClamp = ease / 1000;
    return scale([brightest, hexString, darkest])
        .mode("hsv")
        .domain([-1, -easeClamp, 0, easeClamp, 1]);
}

function spreadColor(
    colorString: string,
    domain: Domain,
    ease: number,
    mag: number
): Record<OutputColorKey, string> {
    const hexString = colorString.match(HEX_COLOR_PATTERN)
        ? (colorString as HexString)
        : ERROR_COLOR_HEX;

    const cScale = colorScale(hexString, ease, mag);

    const spread: Partial<Record<OutputColorKey, string>> = {};
    for (let i = 1; i <= COLOR_CT; i++) {
        // start at 1 to make curving easier

        const label: OutputColorKey = `color${domain}${i * 100}`;
        const normalized = 2 * ((i - COLOR_CT) / (1 - COLOR_CT)) - 1;

        spread[label] = cScale(normalized).hex();
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
