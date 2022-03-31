export default function mergeProperties(src, target) {
    if (Array.isArray(src)) {
        for (let index = 0; index < src.length; index++) {
            const srcElement = src[index];
            const targetElement = target[index];
            if (targetElement) {
                mergeProperties(srcElement, targetElement);
                continue;
            }
            target[index] = targetElement;
        }
        return;
    }

    for (const key in src) {
        if (Object.prototype.hasOwnProperty.call(src, key)) {
            const srcElement = src[key];
            if (typeof srcElement !== "object") {
                if (srcElement !== void 0) {
                    target[key] = srcElement;
                }
                continue;
            }
            // check if it is a date...
            if (srcElement instanceof Date) {
                target[key] = srcElement;
                continue;
            }
            const targetElement = target[key];
            if (targetElement) {
                mergeProperties(srcElement, targetElement);
                continue;
            }
            target[key] = targetElement;
        }
    }
}
