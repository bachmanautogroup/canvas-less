import Property = ComponentFramework.PropertyTypes.Property;
import {ColorHex} from "./color";

export const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

export type Digit = typeof DIGITS[number];

function log(msg: string, type: string, logTo: string[]): void {
    const logString = `LESS_CANVAS - ${new Date().toISOString()} :: ${type} :: ${msg}`;
    logTo.push(logString);
}

export function error(e: Error, logTo: string[]): void {
    return log(`${e.message} \n ${e}`, "ERROR", logTo);
}

export function debug(msg: string, logTo: string[]): void {
    return log(msg, "debug", logTo);
}

type TypeString = "string" | "number" | "boolean" | "hex";


const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}){1,2}$/
const ERROR_COLOR_HEX = "#FF69B4"
const ERROR_STRING = "ERROR"
const ERROR_NUMBER = 999.0

export function mapType(prop: Property, type: "string"): string;
export function mapType(prop: Property, type: "hex"): ColorHex;
export function mapType(prop: Property, type: "boolean"): boolean;
export function mapType(prop: Property, type: "number"): number;
export function mapType(prop: Property, type: TypeString): string | number | boolean | ColorHex {
    const value = prop.raw;

    switch (type) {
        case "boolean":
            return !!value;

        case "string":
            return value ?? ERROR_STRING;

        case "number":
            return value ?? ERROR_NUMBER;

        case "hex":
            return mapType(prop, "string").match(HEX_COLOR_PATTERN)
                ? (value as ColorHex)
                : ERROR_COLOR_HEX;
    }
}