import { Subscription } from "rxjs";

import { IInputs, IOutputs } from "./generated/ManifestTypes";
import StandardControl = ComponentFramework.StandardControl;
import Context = ComponentFramework.Context;

import { Control } from "./canvas-less/control";

import {
    ControlInputObservables,
    inputComplete,
    inputObservables,
    inputsSubject,
    InputSubject,
    updateInputs,
    outputObservables,
    OutputObservables,
    outputsGet,
    outputsSubject,
    OutputSubject,
    subscribeBound,
} from "./canvas-less/params";
import { buildColors } from "./canvas-less/color";
import { buildSizes } from "./canvas-less/size";
import { buildCSS, buildLess } from "./canvas-less/style";
import {
    ContainerSizeSubject,
    debug,
    subscribeDebug,
    logSubject,
    LogSubject,
    sizeSubject,
    sizeUpdate,
} from "./canvas-less/debug";
import { subscribeStyle } from "./canvas-less/control";

const DEVELOPMENT_MODE = true;

export class CanvasLess implements StandardControl<IInputs, IOutputs> {
    private log: LogSubject;

    private control: Control;
    private id: string;
    private containerId: string;

    private inputs: InputSubject;
    private inputObservables: ControlInputObservables;
    private outputObservables: OutputObservables;
    private outputs: OutputSubject;

    private size: ContainerSizeSubject;

    private debugSubscription: Subscription;
    private styleSubscription: Subscription;
    private boundSubscription: Subscription;

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this.log = logSubject(DEVELOPMENT_MODE);
        debug(this.log, "#INIT# starting!");

        this.setControl(context, notifyOutputChanged, container);
        this.setObservables();
        this.setSubscriptions();

        updateInputs(this.inputs, this.control.context.parameters);
        debug(this.log, "#INIT# complete!");
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this.control.context = context;

        if (context.updatedProperties.length || DEVELOPMENT_MODE) {
            sizeUpdate(
                context.mode.allocatedWidth,
                context.mode.allocatedHeight,
                this.size
            );
            return updateInputs(this.inputs, context.parameters);
        }
    }

    public getOutputs(): IOutputs {
        return outputsGet(this.log, this.outputs);
    }

    public destroy(): void {
        debug(this.log, "component destroyed!");
        return inputComplete(this.inputs, this.log);
    }

    private setControl(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        container: HTMLDivElement
    ): void {
        this.control = control(context, container, notifyOutputChanged);
        this.id = controlId(this.control.context.mode.label);
        this.containerId = controlContainerId(this.control.context.mode.label);
        this.control.context.mode.trackContainerResize(true);
        this.size = sizeSubject();
        debug(this.log, "#INIT# control set!");
    }

    private setObservables(): void {
        this.inputs = inputsSubject();
        this.inputObservables = inputObservables(
            this.inputs,
            this.control.context.parameters,
            this.log
        );
        this.outputObservables = outputObservables(
            this.inputObservables,
            {
                colors: buildColors,
                sizes: buildSizes,
                css: buildCSS,
                less: buildLess,
            },
            this.log
        );
        this.outputs = outputsSubject(this.outputObservables);
        debug(this.log, "#INIT# observables set!");
    }

    private setSubscriptions(): void {
        this.debugSubscription = subscribeDebug(
            this.containerId,
            this.control.container,
            this.outputObservables,
            this.size,
            this.inputObservables.showDebug,
            this.log
        );
        this.styleSubscription = subscribeStyle(
            this.id,
            this.containerId,
            this.inputObservables.keepStyle,
            this.outputObservables.css
        );
        this.boundSubscription = subscribeBound(
            this.outputs,
            this.control.notifyOutputChanged,
            this.log
        );
        debug(this.log, "#INIT# subscriptions set!");
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
    return `LessCanvas_${label}-debugcontainer`;
}
