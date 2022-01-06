import DateTime from "@web-atoms/date-time/dist/DateTime";

export const dateFormatISORegEx = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/;

export default function resolve(target) {
    const cache = [];
    const pending = [];
    function mapIds(t) {
        if (Array.isArray(t)) {
            for (const iterator of t) {
                mapIds(iterator);
            }
            return;
        }
        const { $id, $type } = t;
        if ($type) {
            if (cache[$id]) {
                // we have read this...
                return;
            }
            cache[$id] = t;
        } else {
            pending.push(t);
            return;
        }
        for (const key in t) {
            if (Object.prototype.hasOwnProperty.call(t, key)) {
                const element = t[key];
                switch (typeof element) {
                    case "object":
                        if (element !== null) {
                            mapIds(element);
                        }
                        continue;
                    case "string":
                        if (dateFormatISORegEx.test(element)) {
                            // it is a date...
                            t[key] = new DateTime(element);
                        }
                }
            }
        }
    }
    if (target === null) {
        return;
    }
    if (typeof target === "object") {
        mapIds(target);
        for (const iterator of pending) {
            const existing = cache[iterator.$id];
            if (!existing) {
                continue;
            }
            for (const key in existing) {
                if (Object.prototype.hasOwnProperty.call(existing, key)) {
                    const element = existing[key];
                    iterator[key] = element;
                }
            }
        }
    }
    return target;
}
