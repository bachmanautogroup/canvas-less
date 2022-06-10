import { IInputs } from "../generated/ManifestTypes";
import { Observable, Subscription, combineLatest } from "rxjs";

export interface Control {
    context: ComponentFramework.Context<IInputs>;
    container: HTMLDivElement;
    notifyOutputChanged: () => void;
}

export function subscribeStyle(
    id: string,
    containerId: string,
    keep: Observable<boolean>,
    css: Observable<string>
): Subscription {
    const element = document.createElement("style");
    element.id = id;

    document.head.appendChild(element);

    const observed = combineLatest([keep, css]);

    let lastKeep: boolean;
    return observed.subscribe({
        next: ([keep, cssContents]) => {
            lastKeep = keep;

            if (!keep) {
                // if control container no longer exists (in case keep is switched off after element is destroyed)
                if (!document.querySelector(`#${containerId}`)) {
                    element.innerHTML = "";
                }
            }

            element.innerHTML = cssContents;
        },
        complete: () => {
            if (!lastKeep) {
                element.innerHTML = "";
            }
        },
    });
}
