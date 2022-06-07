import {Digit} from "./util";

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