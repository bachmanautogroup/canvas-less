import { IInputs, IOutputs } from "../generated/ManifestTypes";
import {
    BehaviorSubject,
    combineLatest,
    debounceTime,
    distinctUntilChanged,
    distinctUntilKeyChanged,
    first,
    map,
    Observable,
    ObservableInput,
    OperatorFunction,
    pluck,
    ReplaySubject, share,
    skipUntil,
    Subscription,
    tap,
} from "rxjs";

import Property = ComponentFramework.PropertyTypes.Property;
import StringProperty = ComponentFramework.PropertyTypes.StringProperty;
import TwoOptionsProperty = ComponentFramework.PropertyTypes.TwoOptionsProperty;
import DecimalNumberProperty = ComponentFramework.PropertyTypes.DecimalNumberProperty;

import { coerceType, ObservedObject } from "./util";
import { SizeSpread } from "./size";
import { ColorSpread } from "./color";
import { debug, LogSubject } from "./debug";

const BUFFER_TIME = 500;

export type InputSubject = ReplaySubject<IInputs>;
export type OutputSubject = BehaviorSubject<IOutputs>;

export type ControlInputObservables = Record<string, Observable<any>> & {
    [K in keyof IInputs]: IInputs[K] extends StringProperty
        ? Observable<string>
        : IInputs[K] extends TwoOptionsProperty
        ? Observable<boolean>
        : IInputs[K] extends DecimalNumberProperty
        ? Observable<number>
        : never;
};

export function inputsSubject(): InputSubject {
    return new ReplaySubject<IInputs>(1);
}

export function updateInputs(
    inputSubject: InputSubject,
    inputs: IInputs
): void {
    inputSubject.next(inputs);
}

type _ObservableObject = Record<string, ObservableInput<any>>;

export function inputObservables(
    inputSubject: InputSubject,
    inputs: IInputs,
    logger: LogSubject
): ControlInputObservables {
    return Object.entries(inputs).reduce((acc, [key]) => {
        const tKey = key as keyof ControlInputObservables;
        acc[tKey] = inputSubject.pipe(
            debounceTime(BUFFER_TIME),
            pluck(key) as OperatorFunction<IInputs, Property>,
            distinctUntilKeyChanged("raw"),
            tap((v) => debug(logger, `input changed! ${key} --> ${v.raw}`)),
            map((v: Property) => coerceType(v)),
            share()
        ) as any;
        return acc;
    }, {} as Partial<ControlInputObservables>) as ControlInputObservables;
}

export function inputComplete(inputs: InputSubject, log: LogSubject): void {
    debug(log, `inputs completed!`);
    return inputs.complete();
}

export interface OutputObservables extends _ObservableObject {
    css: Observable<string>;
    less: Observable<string>;
    colors: Observable<ColorSpread>;
    sizes: Observable<SizeSpread>;
}

export type OutputObservableMap = {
    [Key in keyof OutputObservables]: (
        // in a type >.>
        // eslint-disable-next-line no-unused-vars
        input: Key extends "css"
            ? Omit<OutputObservables, "css">
            : ControlInputObservables,
        // eslint-disable-next-line no-unused-vars
        log: LogSubject
    ) => OutputObservables[Key];
};

export function outputObservables(
    input: ControlInputObservables,
    outputMap: OutputObservableMap,
    log: LogSubject
): OutputObservables {
    const pre: Omit<OutputObservables, "css"> = {
        less: outputMap["less"](input, log),
        colors: outputMap["colors"](input, log),
        sizes: outputMap["sizes"](input, log),
    };

    return Object.assign(pre, {
        css: outputMap.css(pre, log),
    }) as OutputObservables;
}

export function outputsSubject(
    output: OutputObservables,
    // shut up eslint, it's in a type >.>
    // eslint-disable-next-line no-unused-vars
    err?: (e: any) => void
): OutputSubject {
    const subject = new BehaviorSubject<IOutputs>({});

    // not deprecated - using object implementation
    // noinspection JSDeprecatedSymbols
    const observed = combineLatest(output);
    const subscription: Subscription = observed.subscribe({
        next(value: ObservedObject<OutputObservables>) {
            subject.next({
                css: value.css,
                less: value.less,
                ...value.colors,
                ...value.sizes,
            });
        },
        complete() {
            subject.complete();
            subscription.unsubscribe();
        },
        error: err,
    });

    return subject;
}

function compareBound(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

export function subscribeBound(
    output: OutputSubject,
    notifier: () => void,
    log: LogSubject
): Subscription {
    // observer to let outputs initialize before firing any events
    const initialized = output.pipe(
        first(),
        tap(() => {
            debug(log, `output initialized, taking all outputs now...`);
        })
    );

    return output
        .pipe(skipUntil(initialized), distinctUntilChanged(compareBound))
        .subscribe({
            next: () => {
                debug(log, `output changed, notifying...`);
                notifier();
            },
            complete: () => {
                debug(log, `observed outputs completed!`);
            },
        });
}

export function outputsGet(log: LogSubject, output: OutputSubject): IOutputs {
    debug(log, "retrieving outputs!");
    return output.getValue();
}
