// import {
//     auditTime,
//     BehaviorSubject,
//     combineLatest,
//     debounceTime,
//     map,
//     Observable,
//     OperatorFunction,
//     pluck,
//     switchMap,
//     tap,
//     withLatestFrom,
// } from "rxjs";
//
// import Property = ComponentFramework.PropertyTypes.Property;
//
// import { IInputs, IOutputs } from "./generated/ManifestTypes";
//
// import { coerceToHex, ColorSpread, spreadColors } from "./lib/color";
// import { coerceType, debug, error }               from "./lib/util";
// import {
//     compileCss,
//     createStyleElement,
//     joinedLess,
//     lessVars,
//     removeStyleElement,
// }                                                 from "./lib/style";
// import { SizeSpread, spreadSizes }                from "./lib/size";
// import { buildControlHTML, buildDomString }       from "./lib/control";
// import { Control, ControlInputObservables }                    from "./lib/control";
//
// export class CanvasLess
//     implements ComponentFramework.StandardControl<IInputs, IOutputs> {
//     private control: Control;
//
//     get id(): string {
//         return `LessCanvas_${this.control.context.mode.label}`;
//     }
//
//     get debugId(): string {
//         return `LessCanvas-debugwindow-${this.id}`;
//     }
//
//     private outputLog: string[];
//
//     private inputs$: BehaviorSubject<IInputs>;
//
//     private parameters: ControlInputObservables;
//
//     private colors$: Observable<ColorSpread>;
//     private sizes$: Observable<SizeSpread>;
//     private less$: Observable<string>;
//     private css$: Observable<string>;
//
//     private outputs$ = new BehaviorSubject<IOutputs>({});
//
//     private domString: string = buildDomString();
//
//     public init(
//         context: ComponentFramework.Context<IInputs>,
//         notifyOutputChanged: () => void,
//         state: ComponentFramework.Dictionary,
//         container: HTMLDivElement
//     ): void {
//         this.control = {
//             context,
//             container,
//             notifyOutputChanged,
//         };
//         this.control.context.mode.trackContainerResize(true);
//
//         this.control.container.id = this.debugId;
//
//         this.outputLog = [];
//
//         this.inputs$ = new BehaviorSubject<IInputs>(context.parameters);
//
//         this.parameters = this.makeParameters();
//
//         this.colors$ = this.makeColors$();
//         this.sizes$ = this.makeSizes$();
//         this.less$ = this.makeLess$();
//         this.css$ = this.makeCss$();
//
//         this.outputs$ = this.makeOutputs();
//
//         this.makeStyle();
//         this.makeDebug();
//
//         this.outputs$.pipe(auditTime(100)).subscribe(() => this.notifyOutput());
//     }
//
//     public updateView(context: ComponentFramework.Context<IInputs>): void {
//         if (
//             context.updatedProperties.some(
//                 (s) =>
//                     (s.includes("color") ||
//                         s.includes("size") ||
//                         s.includes("style")) &&
//                     s in context.parameters
//             )
//         ) {
//             this.inputs$.next(context.parameters);
//         }
//
//         if (context.updatedProperties.includes("layout")) {
//             this.control.container.style.maxHeight = `${
//                 this.control.context.mode.allocatedHeight || 0
//             }px`;
//             this.control.container.style.maxWidth = `${
//                 this.control.context.mode.allocatedWidth || 0
//             }px`;
//         }
//     }
//
//     public getOutputs(): IOutputs {
//         return this.outputs$.getValue();
//     }
//
//     public destroy() {
//         this.inputs$.complete();
//     }
//
//     private makeParameters(): ControlInputObservables {
//         return Object.entries(this.control.context.parameters).reduce(
//             (acc, [key]) => {
//                 const tKey = key as keyof ControlInputObservables;
//                 acc[tKey] = this.inputs$.pipe(
//                     pluck(key) as OperatorFunction<IInputs, Property>,
//                     map((v: Property) => coerceType(v))
//                 ) as any;
//                 return acc;
//             },
//             {} as Partial<ControlInputObservables>
//         ) as ControlInputObservables;
//     }
//
//     private makeOutputs(): BehaviorSubject<IOutputs> {
//         const outputSubject = new BehaviorSubject<IOutputs>({});
//
//         combineLatest([
//             this.css$,
//             this.less$,
//             this.colors$,
//             this.sizes$,
//         ]).subscribe({
//             next: ([css, less, colors, sizes]) => {
//                 outputSubject.next({
//                     css,
//                     less,
//                     ...colors,
//                     ...sizes,
//                 });
//             },
//             complete: () => outputSubject.complete(),
//         });
//
//         return outputSubject;
//     }
//
//     private makeColors$(): Observable<ColorSpread> {
//         const {
//             style,
//             keepStyle,
//             sizeEmGridSeed,
//             sizeEmGridMult,
//             ...colorSeeds
//         } = this.parameters;
//         void style;
//         void keepStyle;
//         void sizeEmGridSeed;
//         void sizeEmGridMult;
//
//         return combineLatest<ControlInputObservables>(colorSeeds as ControlInputObservables).pipe(
//             map((seeds) => {
//                 return spreadColors(
//                     {
//                         Danger: coerceToHex(seeds.colorDangerSeed),
//                         Info: coerceToHex(seeds.colorInfoSeed),
//                         Neutral: coerceToHex(seeds.colorNeutralSeed),
//                         Primary: coerceToHex(seeds.colorPrimarySeed),
//                         Secondary: coerceToHex(seeds.colorSecondarySeed),
//                         Success: coerceToHex(seeds.colorSuccessSeed),
//                         Tertiary: coerceToHex(seeds.colorTertiarySeed),
//                         Warning: coerceToHex(seeds.colorWarningSeed),
//                     },
//                     {
//                         Danger: {
//                             ease: seeds.colorDangerEase,
//                             magnitude: seeds.colorDangerMagnitude,
//                         },
//                         Info: {
//                             ease: seeds.colorInfoEase,
//                             magnitude: seeds.colorInfoMagnitude,
//                         },
//                         Neutral: {
//                             ease: seeds.colorNeutralEase,
//                             magnitude: seeds.colorNeutralMagnitude,
//                         },
//                         Primary: {
//                             ease: seeds.colorPrimaryEase,
//                             magnitude: seeds.colorPrimaryMagnitude,
//                         },
//                         Secondary: {
//                             ease: seeds.colorSecondaryEase,
//                             magnitude: seeds.colorSecondaryMagnitude,
//                         },
//                         Success: {
//                             ease: seeds.colorSuccessEase,
//                             magnitude: seeds.colorSuccessMagnitude,
//                         },
//                         Tertiary: {
//                             ease: seeds.colorTertiaryEase,
//                             magnitude: seeds.colorTertiaryMagnitude,
//                         },
//                         Warning: {
//                             ease: seeds.colorWarningEase,
//                             magnitude: seeds.colorWarningMagnitude,
//                         },
//                     }
//                 );
//             })
//         );
//     }
//
//     private makeSizes$(): Observable<SizeSpread> {
//         return combineLatest([
//             this.parameters.sizeEmGridSeed,
//             this.parameters.sizeEmGridMult,
//         ]).pipe(
//             map(([size, mult]) => {
//                 return spreadSizes(size, mult);
//             })
//         );
//     }
//
//     private makeLess$(): Observable<string> {
//         return this.parameters.style.pipe(map((input) => joinedLess(input)));
//     }
//
//     private makeCss$(): Observable<string> {
//         return combineLatest([this.less$, this.colors$, this.sizes$]).pipe(
//             switchMap(async ([less, colors, sizes]) => {
//                 try {
//                     return await compileCss(less, lessVars(colors, sizes));
//                 } catch (e) {
//                     error(e as Error, this.outputLog);
//                     return "";
//                 }
//             })
//         );
//     }
//
//     private makeStyle(): void {
//         const styleObservable = this.outputs$.pipe(pluck("css"));
//
//         let keepOnComplete = false;
//         styleObservable
//             .pipe(
//                 withLatestFrom(this.parameters.keepStyle),
//                 tap(([, keep]) => (keepOnComplete = keep))
//             )
//             .subscribe({
//                 next: ([style]) => {
//                     createStyleElement(style || "", this.id);
//                 },
//                 error: (err: any) => {
//                     error(err as Error, this.outputLog);
//                 },
//                 complete: () => {
//                     if (!keepOnComplete) {
//                         removeStyleElement(this.id);
//                     }
//                 },
//             });
//     }
//
//     private makeDebug(): void {
//         const inputs = combineLatest([
//             this.less$,
//             this.css$,
//             this.colors$,
//             this.sizes$,
//         ]).pipe(debounceTime(3000));
//
//         combineLatest([inputs, this.parameters.showDebug]).subscribe(
//             ([[less, css, colors, sizes], show]) => {
//                 if (!show) {
//                     this.control.container.innerHTML = "";
//                     return;
//                 }
//
//                 this.control.container.style.maxHeight = `${
//                     this.control.context.mode.allocatedHeight || 0
//                 }px`;
//                 this.control.container.style.maxWidth = `${
//                     this.control.context.mode.allocatedWidth || 0
//                 }px`;
//
//                 this.control.container.innerHTML = buildControlHTML(
//                     this.debugId,
//                     colors,
//                     sizes,
//                     css,
//                     less,
//                     this.outputLog,
//                     this.domString
//                 );
//             }
//         );
//     }
//
//     private notifyOutput(): void {
//         this.control.notifyOutputChanged();
//         debug("output changed, notifying...", this.outputLog);
//     }
// }

import { distinct, Subscription } from "rxjs";

import { IInputs, IOutputs } from "./generated/ManifestTypes";
import StandardControl = ComponentFramework.StandardControl;
import Context = ComponentFramework.Context;

import { Control } from "./canvas-less/control";

import {
    ControlInputObservables,
    inputObservables,
    inputsSubject,
    InputSubject,
    inputsUpdate,
    outputObservables,
    OutputObservables,
    outputsGet,
    outputsSubject,
    OutputSubject,
} from "./canvas-less/params";
import { buildColors } from "./canvas-less/color";
import { buildSizes } from "./canvas-less/size";
import { buildCSS, buildLess } from "./canvas-less/style";
import { debugBuilder, logSubject, LogSubject } from "./canvas-less/debug";
import { styleBuilder } from "./canvas-less/control";

export class CanvasLess implements StandardControl<IInputs, IOutputs> {
    private log: LogSubject;

    private control: Control;
    private id: string;
    private containerId: string;

    private inputs: InputSubject;
    private inputObservables: ControlInputObservables;
    private outputObservables: OutputObservables;
    private outputs: OutputSubject;

    private debugSubscription: Subscription;
    private styleSubscription: Subscription;

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this.log = logSubject();

        this.control = control(context, container, notifyOutputChanged);
        this.id = controlId(this.control.context.mode.label);
        this.containerId = controlContainerId(this.control.context.mode.label);

        this.inputs = inputsSubject();

        this.inputObservables = inputObservables(
            this.inputs,
            this.control.context.parameters
        );
        this.outputObservables = outputObservables(this.inputObservables, {
            colors: buildColors,
            sizes: buildSizes,
            css: buildCSS,
            less: buildLess,
        });
        this.outputs = outputsSubject(this.outputObservables);

        this.debugSubscription = debugBuilder(
            this.containerId,
            this.control.container,
            this.outputObservables,
            this.inputObservables.showDebug,
            this.log
        );
        this.styleSubscription = styleBuilder(
            this.id,
            this.containerId,
            this.inputObservables.keepStyle,
            this.outputObservables.css
        );

        this.outputs.subscribe((e) => {
            console.log(e);
            notifyOutputChanged();
        });

        inputsUpdate(this.inputs, this.control.context.parameters)
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this.control.context = context;

        if (context.updatedProperties.length) {
            return inputsUpdate(this.inputs, context.parameters);
        }
    }

    public getOutputs(): IOutputs {
        return outputsGet(this.outputs);
    }

    public destroy(): void {
        return this.inputs.complete();
    }
}

function control(
    context: Context<IInputs>,
    container: HTMLDivElement,
    notifyOutputChanged: () => void
): Control {
    return {
        context,
        container,
        notifyOutputChanged,
    };
}

function controlId(label: string): string {
    return `LessCanvas_${label}`;
}

function controlContainerId(label: string): string {
    return `LessCanvas_${label}_container`;
}
