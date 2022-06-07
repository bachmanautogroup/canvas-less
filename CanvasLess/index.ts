import {
    auditTime,
    BehaviorSubject,
    combineLatest, debounceTime,
    isObservable,
    map,
    Observable,
    pluck,
    switchMap,
    tap,
    withLatestFrom
} from "rxjs";

import {IInputs, IOutputs} from "./generated/ManifestTypes";

import {ColorHex, ColorSpread, spreadColors} from "./lib/color";
import {debug, error, mapType} from "./lib/util";
import {compileCss, createStyleElement, joinedLess, lessVars, removeStyleElement} from "./lib/style";
import {SizeSpread, spreadSizes} from "./lib/size";
import {buildControlHTML} from "./lib/control";

interface Control {
    context: ComponentFramework.Context<IInputs>,
    container: HTMLDivElement,
    notifyOutputChanged: () => void
}

interface Parameters {
    style$: Observable<string>;

    keepStyle$: Observable<boolean>;

    colorPrimarySeed$: Observable<ColorHex>;
    colorSecondarySeed$: Observable<ColorHex>;
    colorTertiarySeed$: Observable<ColorHex>;
    colorNeutralSeed$: Observable<ColorHex>;

    colorInfoSeed$: Observable<ColorHex>;
    colorSuccessSeed$: Observable<ColorHex>;
    colorWarningSeed$: Observable<ColorHex>;
    colorDangerSeed$: Observable<ColorHex>;

    colorPrimaryEase$: Observable<number>;
    colorSecondaryEase$: Observable<number>;
    colorTertiaryEase$: Observable<number>;
    colorNeutralEase$: Observable<number>;

    colorInfoEase$: Observable<number>;
    colorSuccessEase$: Observable<number>;
    colorWarningEase$: Observable<number>;
    colorDangerEase$: Observable<number>;

    colorPrimaryMagnitude$: Observable<number>;
    colorSecondaryMagnitude$: Observable<number>;
    colorTertiaryMagnitude$: Observable<number>;
    colorNeutralMagnitude$: Observable<number>;

    colorInfoMagnitude$: Observable<number>;
    colorSuccessMagnitude$: Observable<number>;
    colorWarningMagnitude$: Observable<number>;
    colorDangerMagnitude$: Observable<number>;

    sizeEmGridSeed$: Observable<number>;
}

export class CanvasLess implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private control: Control;

    get id(): string {
        return `LessCanvas_${this.control.context.mode.label}`;
    }

    get debugId(): string {
        return `LessCanvas-debugwindow-${this.id}`
    }

    private outputLog: string[];

    private inputs$: BehaviorSubject<IInputs>;

    private parameters: Parameters;

    colors$: Observable<ColorSpread>;
    sizes$: Observable<SizeSpread>;
    less$: Observable<string>;
    css$: Observable<string>;

    private outputs$: BehaviorSubject<IOutputs> = new BehaviorSubject<IOutputs>({});

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this.control = {
            context,
            container,
            notifyOutputChanged
        }
        this.control.context.mode.trackContainerResize(true)

        this.control.container.id = this.debugId

        this.outputLog = []

        this.inputs$ = new BehaviorSubject<IInputs>(context.parameters)

        this.parameters = this.makeParameters();

        this.colors$ = this.makeColorSpread$()
        this.sizes$ = this.makeSizeSpread$()
        this.less$ = this.makeLess$()
        this.css$ = this.makeCss$()

        this.outputs$ = this.makeOutputs();

        this.makeStyle();
        this.makeDebug();
        this.outputs$.pipe(auditTime(100)).subscribe(() => this.notifyOutput());
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        if (context.updatedProperties.some(s =>
            (s.includes("color") || s.includes("size") || s.includes("style"))
            && s in context.parameters)
        ) {
            this.inputs$.next(context.parameters);
        }

        if (context.updatedProperties.includes("layout")) {
            this.control.container.style.maxHeight = `${this.control.context.mode.allocatedHeight || 0}px`
            this.control.container.style.maxWidth = `${this.control.context.mode.allocatedWidth || 0}px`
        }
    }

    public getOutputs(): IOutputs {
        return this.outputs$.getValue();
    }

    public destroy() {
        this.inputs$.complete()
    }

    private makeParameters(): Parameters {
        // could make this loop
        return {
            colorDangerSeed$: this.inputs$.pipe(map(p => mapType(p.colorDangerSeed, "hex"))),
            colorInfoSeed$: this.inputs$.pipe(map(p => mapType(p.colorInfoSeed, "hex"))),
            colorNeutralSeed$: this.inputs$.pipe(map(p => mapType(p.colorNeutralSeed, "hex"))),
            colorPrimarySeed$: this.inputs$.pipe(map(p => mapType(p.colorPrimarySeed, "hex"))),
            colorSecondarySeed$: this.inputs$.pipe(map(p => mapType(p.colorSecondarySeed, "hex"))),
            colorSuccessSeed$: this.inputs$.pipe(map(p => mapType(p.colorSuccessSeed, "hex"))),
            colorTertiarySeed$: this.inputs$.pipe(map(p => mapType(p.colorTertiarySeed, "hex"))),
            colorWarningSeed$: this.inputs$.pipe(map(p => mapType(p.colorWarningSeed, "hex"))),
            colorDangerEase$: this.inputs$.pipe(map(p => mapType(p.colorDangerEase, "number"))),
            colorInfoEase$: this.inputs$.pipe(map(p => mapType(p.colorInfoEase, "number"))),
            colorNeutralEase$: this.inputs$.pipe(map(p => mapType(p.colorNeutralEase, "number"))),
            colorPrimaryEase$: this.inputs$.pipe(map(p => mapType(p.colorPrimaryEase, "number"))),
            colorSecondaryEase$: this.inputs$.pipe(map(p => mapType(p.colorSecondaryEase, "number"))),
            colorSuccessEase$: this.inputs$.pipe(map(p => mapType(p.colorSuccessEase, "number"))),
            colorTertiaryEase$: this.inputs$.pipe(map(p => mapType(p.colorTertiaryEase, "number"))),
            colorWarningEase$: this.inputs$.pipe(map(p => mapType(p.colorWarningEase, "number"))),
            colorDangerMagnitude$: this.inputs$.pipe(map(p => mapType(p.colorDangerMagnitude, "number"))),
            colorInfoMagnitude$: this.inputs$.pipe(map(p => mapType(p.colorInfoMagnitude, "number"))),
            colorNeutralMagnitude$: this.inputs$.pipe(map(p => mapType(p.colorNeutralMagnitude, "number"))),
            colorPrimaryMagnitude$: this.inputs$.pipe(map(p => mapType(p.colorPrimaryMagnitude, "number"))),
            colorSecondaryMagnitude$: this.inputs$.pipe(map(p => mapType(p.colorSecondaryMagnitude, "number"))),
            colorSuccessMagnitude$: this.inputs$.pipe(map(p => mapType(p.colorSuccessMagnitude, "number"))),
            colorTertiaryMagnitude$: this.inputs$.pipe(map(p => mapType(p.colorTertiaryMagnitude, "number"))),
            colorWarningMagnitude$: this.inputs$.pipe(map(p => mapType(p.colorWarningMagnitude, "number"))),
            keepStyle$: this.inputs$.pipe(map(p => mapType(p.keepStyle, "boolean"))),
            sizeEmGridSeed$: this.inputs$.pipe(map(p => mapType(p.sizeEmGridSeed, "number"))),
            style$: this.inputs$.pipe(map(p => mapType(p.style, "string")), debounceTime(2000)) // debounce to make typing directly in the PowerApps formula bar easier
        }
    }

    private makeOutputs(): BehaviorSubject<IOutputs> {
        const outputSubject = new BehaviorSubject<IOutputs>({})

        combineLatest([this.css$, this.less$, this.colors$, this.sizes$])
            .subscribe(([css, less, colors, sizes]) => {
                outputSubject.next({
                    css,
                    less,
                    ...colors,
                    ...sizes
                })
            })

        return outputSubject;
    }

    private makeColorSpread$(): Observable<ColorSpread> {
        const {style$, keepStyle$, sizeEmGridSeed$, ...colorSeeds} = this.parameters
        void style$
        void keepStyle$
        void sizeEmGridSeed$

        return combineLatest(
            colorSeeds as Omit<Parameters, "keepStyle$" | "sizeEmGridSeed$" | "style$">
        ).pipe(map(seeds => {
            return spreadColors({
                Danger: seeds.colorDangerSeed$,
                Info: seeds.colorInfoSeed$,
                Neutral: seeds.colorNeutralSeed$,
                Primary: seeds.colorPrimarySeed$,
                Secondary: seeds.colorSecondarySeed$,
                Success: seeds.colorSuccessSeed$,
                Tertiary: seeds.colorTertiarySeed$,
                Warning: seeds.colorWarningSeed$
            }, {
                Danger: {
                    ease: seeds.colorDangerEase$,
                    magnitude: seeds.colorDangerMagnitude$
                },
                Info: {
                    ease: seeds.colorInfoEase$,
                    magnitude: seeds.colorInfoMagnitude$
                },
                Neutral: {
                    ease: seeds.colorNeutralEase$,
                    magnitude: seeds.colorNeutralMagnitude$
                },
                Primary: {
                    ease: seeds.colorPrimaryEase$,
                    magnitude: seeds.colorPrimaryMagnitude$
                },
                Secondary: {
                    ease: seeds.colorSecondaryEase$,
                    magnitude: seeds.colorSecondaryMagnitude$
                },
                Success: {
                    ease: seeds.colorSuccessEase$,
                    magnitude: seeds.colorSuccessMagnitude$
                },
                Tertiary: {
                    ease: seeds.colorTertiaryEase$,
                    magnitude: seeds.colorTertiaryMagnitude$
                },
                Warning: {
                    ease: seeds.colorWarningEase$,
                    magnitude: seeds.colorWarningMagnitude$
                },
            })
        }));
    }

    private makeSizeSpread$(): Observable<SizeSpread> {
        const {sizeEmGridSeed$,} = this.parameters
        return sizeEmGridSeed$.pipe(map(size => {
            return spreadSizes(size)
        }));
    }

    private makeLess$(): Observable<string> {
        const {style$,} = this.parameters
        return style$.pipe(map(input => joinedLess(input)));
    }

    private makeCss$(): Observable<string> {
        return combineLatest([this.less$, this.colors$, this.sizes$])
            .pipe(switchMap(async ([less, colors, sizes]) => {
                try {
                    return await compileCss(less, lessVars(colors, sizes));
                } catch (e) {
                    error(e as Error, this.outputLog)
                    return ""
                }
            }))

    }

    private makeStyle(): void {
        const styleObservable = this.outputs$.pipe(pluck("css"));

        let keepOnComplete = false;
        styleObservable.pipe(
            withLatestFrom(this.parameters.keepStyle$),
            tap(([, keep]) => keepOnComplete = keep)
        ).subscribe({
            next: ([style,]) => {
                createStyleElement(style || "", this.id)
            },
            error: (err: any) => {
                error(err as Error, this.outputLog)
            },
            complete: () => {
                if (!keepOnComplete) {
                    removeStyleElement(this.id)
                }
            }
        })
    }

    private makeDebug(): void {
        combineLatest([this.less$, this.css$, this.colors$, this.sizes$])
            .subscribe(([less, css, colors, sizes]) => {
                this.control.container.style.maxHeight = `${this.control.context.mode.allocatedHeight || 0}px`
                this.control.container.style.maxWidth = `${this.control.context.mode.allocatedWidth || 0}px`

                this.control.container.innerHTML = buildControlHTML(
                    this.debugId,
                    colors,
                    sizes,
                    css,
                    less,
                    this.outputLog
                )
            })
    }

    private notifyOutput(): void {
        this.control.notifyOutputChanged()
        debug("output changed, notifying...", this.outputLog)
    }
}