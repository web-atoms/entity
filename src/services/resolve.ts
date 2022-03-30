import DateTime from "@web-atoms/date-time/dist/DateTime";

export const dateFormatISORegEx = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/;

export default function resolve(target) {
    const cache = [];
    function map(t) {
        if (typeof t !== "object") {
            return t;
        }
        if (Array.isArray(t)) {
            return t.map(map);
        }
        const { $id, $ref } = t;
        if ($ref) {
            return cache[$ref];
        } 

        if ($id) {
            cache[$id] = t;
        }        
        for (const key in t) {
            if (Object.prototype.hasOwnProperty.call(t, key)) {
                const element = t[key];
                switch (typeof element) {
                    case "object":
                        if (!element) {
                            continue;
                        }
                        t[key] = map(element);
                        continue;
                    case "string":
                        if (dateFormatISORegEx.test(element)) {
                            // it is a date...
                            t[key] = new DateTime(element);
                        }
                }
            }
        }
        return t;
    }
    return map(target);
}
