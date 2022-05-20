import cloneSource from "../models/cloneSource";

export default function mergeProperties(src, target, visited = new Map()) {
    if (visited.has(src)) {
        return;
    }
    visited.set(src, true);
    if (Array.isArray(src)) {
        for (let index = 0; index < src.length; index++) {
            const srcElement = src[index];
            const targetElement = target[index];
            if (targetElement) {
                mergeProperties(srcElement, targetElement, visited);
                continue;
            }
            target[index] = targetElement;
        }
        return;
    }

    const cloneTarget = target[cloneSource];

    for (const key in src) {
        if (Object.prototype.hasOwnProperty.call(src, key)) {
            const srcElement = src[key];
            if (typeof srcElement !== "object") {
                if (srcElement !== void 0) {
                    target[key] = srcElement;
                    if (cloneTarget) {
                        cloneTarget[key] = srcElement;
                    }
                }
                continue;
            }
            // check if it is a date...
            if (srcElement instanceof Date) {
                target[key] = srcElement;
                if (cloneTarget) {
                    cloneTarget[key] = srcElement;
                }
                continue;
            }
            const targetElement = target[key];
            if (targetElement) {
                if (cloneTarget) {
                    const cloneTargetElement = cloneTarget[key];
                    if (cloneTargetElement) {
                        mergeProperties(srcElement, cloneTargetElement, visited);
                    }
                }
                mergeProperties(srcElement, targetElement, visited);
                continue;
            }
            target[key] = targetElement;
            if (cloneTarget) {
                cloneTarget[key] = targetElement;
            }
        }
    }
}
