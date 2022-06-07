import {Color, hex} from "chroma-js";
import {Digit} from "./util";

export type ColorHex = `#${string}`;


const COLOR_SPREAD_CT = 9;
const COLOR_SETS = [
    "Primary",
    "Secondary",
    "Tertiary",
    "Neutral",
    "Info",
    "Success",
    "Warning",
    "Danger",
] as const;

type Domain = typeof COLOR_SETS[number];

interface SpreadOptions {
    ease: number;
    magnitude: number;
}

type SpreadOptionSet = Partial<Record<Domain, SpreadOptions>>;

type ColorSetSpread<D extends Domain = Domain> = Pick<ColorSpread,
    ColorKey<D>>;

export type ColorKey<D extends Domain = Domain> = `color${D}${Digit}00`;
export type ColorSpread = Record<ColorKey, string>;

export interface ColorSeeds {
    Danger: ColorHex;
    Info: ColorHex;
    Neutral: ColorHex;
    Primary: ColorHex;
    Secondary: ColorHex;
    Success: ColorHex;
    Tertiary: ColorHex;
    Warning: ColorHex;
}

function translateColor(
    colorPosition: number,
    midColor: Color,
    ease: number,
    magnitude: number
): string {
    const normalized =
        2 * ((colorPosition - COLOR_SPREAD_CT) / (1 - COLOR_SPREAD_CT)) - 1;
    const adjustment = Math.abs(
        Math.sin((Math.PI / 2) * Math.pow(normalized, ease)) * magnitude
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
    domain: Domain,
    midColor: ColorHex,
    ease: number,
    magnitude: number
): ColorSetSpread<typeof domain> {
    const color = hex(midColor);

    const spread: Partial<ColorSetSpread> = {};
    for (let i = 1; i <= COLOR_SPREAD_CT; i++) {
        const valueDigit = i.toString(10) as Digit;
        const title: ColorKey = `color${domain}${valueDigit}00`;
        spread[title] = translateColor(i, color, ease, magnitude);
    }

    return spread as ColorSetSpread<typeof domain>;
}

export function spreadColors(seeds: ColorSeeds, options?: SpreadOptionSet): ColorSpread {
    const spread: Partial<ColorSpread> = {};

    for (const [domain, seed] of Object.entries(seeds)) {
        const domainEase = options?.[domain as Domain]?.ease || 1
        const domainMagnitude = options?.[domain as Domain]?.magnitude || 1

        Object.assign(
            spread,
            spreadDomain(domain as Domain, seed, domainEase, domainMagnitude)
        );
    }

    return spread as ColorSpread;
}