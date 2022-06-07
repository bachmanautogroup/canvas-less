import { Observable, combineLatest, map } from "rxjs";

export type SizeOutputKey = `gridSize${number}`;

export type SizeSpread = Record<SizeOutputKey, number>;

import { ControlInputObservables } from "./params";
import { ObservedObject } from "./util";

type SizeInputs = ObservedObject<
    Pick<ControlInputObservables, "sizeEmGridMult" | "sizeEmGridSeed">
>;

const GRID_SPREAD_CT = 9;

function subdivideSize(mid: number, subdivision: number): number {
    return mid * Math.pow(2, subdivision);
}

function spreadSizes(mid: number, mult: number): SizeSpread {
    const spread: Partial<SizeSpread> = {};

    for (let i = 1; i <= GRID_SPREAD_CT; i++) {
        const normalized = 2 * (i / GRID_SPREAD_CT) - 1;
        const subdivision = mult * normalized;

        const label: SizeOutputKey = `gridSize${i * 100}`;
        spread[label] = subdivideSize(mid, subdivision);
    }

    return spread as SizeSpread;
}

export function buildSizes(
    input: ControlInputObservables
): Observable<SizeSpread> {
    // not deprecated - using object implementation
    // noinspection JSDeprecatedSymbols
    const observed = combineLatest({
        sizeEmGridSeed: input.sizeEmGridSeed,
        sizeEmGridMult: input.sizeEmGridMult,
    });
    return observed.pipe(
        map((size: SizeInputs) =>
            spreadSizes(size.sizeEmGridSeed, size.sizeEmGridMult)
        )
    );
}
