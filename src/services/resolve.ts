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
            t = cache[$ref];
            return t;
        } 

        if ($id) {
            t.$deleted = false;
            cache[$id] = t;
        }        
        for (const key in t) {
            if (Object.prototype.hasOwnProperty.call(t, key)) {
                let element = t[key];
                switch (typeof element) {
                    case "object":
                        if (!element) {
                            continue;
                        }
                        element = map(element);
                        t[key] = element;
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
    target = map(target);
    return target;
}
