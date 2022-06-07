import { ObservableInput, ObservedValueOf } from "rxjs";

import Property = ComponentFramework.PropertyTypes.Property;

export type ObservedObject<T> = {
    [K in keyof T]: T[K] extends ObservableInput<any>
        ? ObservedValueOf<T[K]>
        : never;
};

export type TypeString =
    | "SingleLine.Text"
    | "Decimal"
    | "TwoOptions"
    | "Multiple";

const ERROR_STRING = "ERROR";
const ERROR_NUMBER = 999.0;

export function coerceType(prop: Property, type: "SingleLine.Text"): string;
export function coerceType(prop: Property, type: "Multiple"): string;
export function coerceType(prop: Property, type: "TwoOptions"): boolean;
export function coerceType(prop: Property, type: "Decimal"): number;
export function coerceType(prop: Property, type?: TypeString): number;
export function coerceType(
    prop: Property,
    type?: TypeString
): string | number | boolean {
    type = type || (prop.type as TypeString);
    const value = prop.raw;

    switch (type) {
        case "TwoOptions":
            return !!value;

        case "Multiple":
            return value ?? ERROR_STRING;

        case "SingleLine.Text":
            return value ?? ERROR_STRING;

        case "Decimal":
            return value ?? ERROR_NUMBER;
    }
}
