import { IInputs, IOutputs } from "./generated/ManifestTypes";
import {
    ColorHex,
    ColorSpread,
    compileStyle,
    styleVariables,
    SizeSpread,
    spreadColors,
    SpreadConfig,
    spreadSizes,
} from "./lib/style";
import {
    buildDebugWindowHTML,
    buildDomString,
    debug,
    error,
    makeDraggable,
} from "./lib/util";



type LessCanvasState = ComponentFramework.Dictionary & {
    logOutput?: string[];
};

export class LessCanvas
    implements ComponentFramework.StandardControl<IInputs, IOutputs>
{
    private state: LessCanvasState;
    private context: ComponentFramework.Context<IInputs>;
    private notifyOutputChanged: (msg: string) => void;

    get id() {
        return `LessCanvas_${this.context.mode.label}`;
    }

    get debugId() {
        return `LessCanvas-debugwindow-${this.context.mode.label}`;
    }

    get logOutput() {
        if (!this.state.logOutput) {
            this.state.logOutput = [] as string[];
        }

        return this.state.logOutput;
    }

    private _tag: HTMLStyleElement;
    get tag() {
        const tag =
            document.querySelector(`#${this.state.id}`) ||
            document.createElement("style");

        if (tag.parentElement) {
            return tag;
        }
        this._tag = tag as HTMLStyleElement;
        this._tag.id = this.id;

        document.head.appendChild(this._tag);
        return this._tag;
    }

    private _colorSpread?: ColorSpread;
    get colorSpread(): ColorSpread {
        if (!this._colorSpread) {
            this._colorSpread = spreadColors(this.colorSpreadConfig());
        }

        return this._colorSpread;
    }

    private _sizeSpread?: SizeSpread;
    get sizeSpread(): SizeSpread {
        if (!this._sizeSpread) {
            this._sizeSpread = spreadSizes(this.sizeSpreadSeed());
        }

        return this._sizeSpread;
    }

    private _debug: HTMLDivElement;
    get debug() {
        const debugId = `debugwindow-${this.id}`;
        const debug =
            document.querySelector(debugId) || document.createElement("div");

        if (debug.parentElement) {
            return debug;
        }
        this._debug = debug as HTMLDivElement;
        this._debug.id = this.debugId;
        makeDraggable(this._debug);

        document.body.appendChild(this._debug);
        return this._debug;
    }

    private css: string;
    private less: string;

    /**
     * Empty constructor.
     */
    constructor() {}

    /**
     * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
     * Data-set values are not initialized here, use updateView.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
     * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
     * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
     * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.
     */
    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: LessCanvasState,
        container: HTMLDivElement
    ): void {
        // Add control initialization code
        this.state = state || {};

        this.context = context;
        this.notifyOutputChanged = this.wrappedNotify(notifyOutputChanged);

        void this.updateStyle();
    }

    /**
     * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
     */
    public updateView(context: ComponentFramework.Context<IInputs>): void {
        let colorSeedUpdated = false;
        Object.keys(context.parameters)
            .filter((e) => e.includes("Color"))
            .forEach((c) => {
                if (
                    !colorSeedUpdated &&
                    context.updatedProperties.includes(c)
                ) {
                    delete this._colorSpread;
                    this.notifyOutputChanged(`.${c} changed!`);
                }
            });

        if (context.updatedProperties.includes("emGridSizeSeed")) {
            delete this._sizeSpread;
            this.notifyOutputChanged(".gridSizeSeed changed!");
        }

        if (context.updatedProperties.includes("style")) {
            void this.updateStyle();
        }

        if (context.updatedProperties.includes("showDebug")) {
            this.notifyOutputChanged(".showDebug changed!");
        }
    }

    /**
     * It is called by the framework prior to a control receiving new data.
     * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as “bound” or “output”
     */
    public getOutputs(): IOutputs {
        return {
            debugCssOutput: this.css,
            debugLessOutput: this.less,
            ...this.sizeSpread,
            ...this.colorSpread,
        };
    }

    /**
     * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
     * i.e. cancelling any pending remote calls, removing listeners, etc.
     */
    public destroy(): void {
        const keepStyle = this.input("keepStyle", "boolean");

        if (!keepStyle) {
            this._tag?.remove();
        }

        this._debug?.remove();
    }

    private input(key: keyof IInputs, type: "string"): string;
    private input(key: keyof IInputs, type: "hex"): ColorHex;
    private input(key: keyof IInputs, type: "boolean"): boolean;
    private input(key: keyof IInputs, type: "number"): number;
    private input(
        key: keyof IInputs,
        type: "string" | "number" | "boolean" | "hex"
    ): string | number | boolean | ColorHex {
        const value = this.context.parameters[key].raw;

        switch (type) {
            case "boolean":
                return !!value;

            case "string":
                return value || "";

            case "number":
                return value || "";

            case "hex":
                return this.input(key, "string").match(
                    /^#(?:[0-9a-fA-F]{3}){1,2}$/
                )
                    ? (value as ColorHex)
                    : "#FF69B4";
        }
    }

    private wrappedNotify(notify: () => void): (msg: string) => void {
        return (msg: string) => {
            notify();

            debug(`${msg} - notifying app of output change...`, this.logOutput);

            if (this.context.parameters.showDebug) {
                void this.updateDebug();
            }
        };
    }

    private colorSpreadConfig(): SpreadConfig {
        return {
            Primary: {
                mid: this.input("primaryColorSeed", "hex"),
                n1: 3,
                n2: 2,
            },
            Secondary: {
                mid: this.input("secondaryColorSeed", "hex"),
                n1: 3,
                n2: 2,
            },
            Tertiary: {
                mid: this.input("tertiaryColorSeed", "hex"),
                n1: 3,
                n2: 2,
            },
            Neutral: {
                mid: this.input("neutralColorSeed", "hex"),
                n1: 3,
                n2: 3,
            },
            Info: {
                mid: this.input("infoColorSeed", "hex"),
                n1: 2,
                n2: 1,
            },
            Success: {
                mid: this.input("successColorSeed", "hex"),
                n1: 2,
                n2: 1,
            },
            Warning: {
                mid: this.input("warningColorSeed", "hex"),
                n1: 2,
                n2: 1,
            },
            Danger: {
                mid: this.input("dangerColorSeed", "hex"),
                n1: 2,
                n2: 1,
            },
        };
    }

    private sizeSpreadSeed(): number {
        return this.input("emGridSizeSeed", "number");
    }

    private async compileStyle(vars: Record<string, string>): Promise<string> {
        try {
            const css = await compileStyle(
                this.input("style", "string"),
                vars,
                (joined) => {
                    this.less = joined;
                }
            );

            this.css = css;

            return css;
        } catch (e) {
            error(e as Error, this.logOutput);
            return "";
        }
    }

    private async setStyle(): Promise<void> {
        this.tag.textContent = await this.compileStyle(
            styleVariables(this.colorSpread, this.sizeSpread)
        );
    }

    private async setDebug(): Promise<void> {
        this.debug.innerHTML = buildDebugWindowHTML(
            this.id,
            this.colorSpread,
            this.sizeSpread,
            this.css,
            this.less,
            this.logOutput
        );
    }

    private async updateStyle(): Promise<void> {
        return this.setStyle().then(() =>
            this.notifyOutputChanged(".style changed!")
        );
    }

    private async updateDebug(): Promise<void> {
        // don't notify output here
        return this.setDebug();
    }
}
