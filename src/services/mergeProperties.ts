import cloneSource from "../models/cloneSource";

// export default function mergeProperties(src, target, visited = new Map()) {
//     if (visited.has(src)) {
//         return;
//     }
//     visited.set(src, true);
//     if (Array.isArray(src)) {
//         for (let index = 0; index < src.length; index++) {
//             const srcElement = src[index];
//             const targetElement = target[index];
//             if (targetElement) {
//                 mergeProperties(srcElement, targetElement, visited);
//                 continue;
//             }
//             target[index] = targetElement;
//         }
//         return;
//     }

//     const cloneTarget = target[cloneSource];

//     for (const key in src) {
//         if (Object.prototype.hasOwnProperty.call(src, key)) {
//             const srcElement = src[key];
//             if (typeof srcElement !== "object") {
//                 if (srcElement !== void 0) {
//                     target[key] = srcElement;
//                     if (cloneTarget) {
//                         cloneTarget[key] = srcElement;
//                     }
//                 }
//                 continue;
//             }
//             // check if it is a date...
//             if (srcElement instanceof Date) {
//                 target[key] = srcElement;
//                 if (cloneTarget) {
//                     cloneTarget[key] = srcElement;
//                 }
//                 continue;
//             }
//             const targetElement = target[key];
//             if (targetElement) {
//                 if (cloneTarget) {
//                     const cloneTargetElement = cloneTarget[key];
//                     if (cloneTargetElement) {
//                         mergeProperties(srcElement, cloneTargetElement, visited);
//                     }
//                 }
//                 mergeProperties(srcElement, targetElement, visited);
//                 continue;
//             }
//             target[key] = targetElement;
//             if (cloneTarget) {
//                 cloneTarget[key] = targetElement;
//             }
//         }
//     }
// }

const merged = Symbol();

const isObject = (o) => typeof o === "object" && o !== null && !(o instanceof Date);

export default function mergeProperties(src, target, path: string = "0", visited = new Map()) {
    if (visited.has(path)) {
        return;
    }
    if (target[merged]) {
        return;
    }
    target[merged] = true;
    visited.set(path, true);
    if (Array.isArray(src)) {
        for (let index = 0; index < src.length; index++) {
            const srcElement = src[index];
            const targetElement = target[index];
            if (isObject(targetElement)) {
                mergeProperties(srcElement, targetElement, `${path}.${index}`, visited);
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
            if (isObject(targetElement)) {
                if (cloneTarget) {
                    const cloneTargetElement = cloneTarget[key];
                    if (cloneTargetElement) {
                        mergeProperties(srcElement, cloneTargetElement, path + ".$" + key, visited);
                    }
                }
                mergeProperties(srcElement, targetElement, path + "." + key, visited);
                continue;
            }
            target[key] = targetElement;
            if (cloneTarget) {
                cloneTarget[key] = targetElement;
            }
        }
    }
}
