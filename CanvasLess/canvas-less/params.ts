import { IInputs, IOutputs } from "../generated/ManifestTypes";
import {
    BehaviorSubject,
    combineLatest,
    distinct,
    distinctUntilChanged,
    map,
    Observable,
    ObservableInput,
    OperatorFunction,
    pluck, Subject,
    Subscription, tap,
} from "rxjs";

import Property = ComponentFramework.PropertyTypes.Property;
import StringProperty = ComponentFramework.PropertyTypes.StringProperty;
import TwoOptionsProperty = ComponentFramework.PropertyTypes.TwoOptionsProperty;
import DecimalNumberProperty = ComponentFramework.PropertyTypes.DecimalNumberProperty;

import { coerceType, ObservedObject } from "./util";
import { SizeSpread } from "./size";
import { ColorSpread } from "./color";

export type InputSubject = Subject<IInputs>;
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
    return new Subject<IInputs>();
}

export function inputsUpdate(
    inputSubject: InputSubject,
    inputs: IInputs
): void {
    inputSubject.next(inputs);
}

type _ObservableObject = Record<string, ObservableInput<any>>;

export function inputObservables(
    inputSubject: InputSubject,
    inputs: IInputs
): ControlInputObservables {
    return Object.entries(inputs).reduce((acc, [key]) => {
        const tKey = key as keyof ControlInputObservables;
        acc[tKey] = inputSubject.pipe(
            pluck(key) as OperatorFunction<IInputs, Property>,
            map((v: Property) => coerceType(v)),
            distinctUntilChanged((a, b) => a == b)
        ) as any;
        return acc;
    }, {} as Partial<ControlInputObservables>) as ControlInputObservables;
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
            : ControlInputObservables
    ) => OutputObservables[Key];
};

export function outputObservables(
    input: ControlInputObservables,
    outputMap: OutputObservableMap
): OutputObservables {
    const pre: Omit<OutputObservables, "css"> = {
        less: outputMap["less"](input),
        colors: outputMap["colors"](input),
        sizes: outputMap["sizes"](input)
    };

    return Object.assign(pre, { css: outputMap.css(pre) }) as OutputObservables;
}

export function outputsSubject(
    output: OutputObservables,
    // shut up, ts, it's in a type >.>
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

export function outputsGet(output: OutputSubject): IOutputs {
    return output.getValue();
}
