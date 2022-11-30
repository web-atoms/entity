import { ICollection } from "../services/BaseEntityService";
import cloneSource from "./cloneSource";

const getKey = (target, value) => {
    for (const key in target) {
        if (Object.prototype.hasOwnProperty.call(target, key)) {
            const element = target[key];
            if (element === value) {
                return key;
            }
        }
    }
};

export type PropertyPath = Array<(item) => any>;

/* eslint-disable @typescript-eslint/unified-signatures */
export class Cloner<T> {

    protected static copyProperties(src, dest = {}) {
        dest[cloneSource] = src;
        for (const key in src) {
            if (Object.prototype.hasOwnProperty.call(src, key)) {
                const element = src[key];
                switch(typeof element) {
                    case "bigint":
                    case "boolean":
                    case "number":
                    case "string":
                        dest[key] = element;
                        break;
                    case "object":
                        if (element === null){
                            dest[key] = null;
                        }
                        if (element instanceof Date) {
                            dest[key] = element;
                        }
                        break;
                }
            }
        }
        return dest;
    }

    public readonly $type: string;

    public get copy(): T {

        const copy = Cloner.copyProperties(this.item);
        if (this.path) {
            for (const iterator of this.path) {
                this.clone(this.item, copy, iterator);
            }
        }
        return copy as any;
    }

    constructor(protected item: T, protected path?: PropertyPath[]) {
        this.$type = (item as any).$type;
    }

    public include<TProperty>(property: (item: T) => ICollection<TProperty> | TProperty): PropertyCloner<T, TProperty>;
    // public include<TProperty>(property: (item: T) => TProperty[]): PropertyCloner<T, TProperty>;
    // public include<TProperty>(property: (item: T) => TProperty): PropertyCloner<T, TProperty>;
    public include<TProperty>(property: any): PropertyCloner<T, TProperty> {
        const last = [property];
        return new PropertyCloner(this.item, this.path ? [... this.path, last]: [last], last);
    }

    private clone(src, dest, paths) {
        if (!paths.length) {
            return dest;
        }
        const [first, ... others] = paths;
        let p = first(src);
        if (!p) {
            return dest;
        }
        const original = p;
        const name = getKey(src, p);
        if (Array.isArray(p)) {
            const existing = dest[name] ??= [];
            for (let index = 0; index < p.length; index++) {
                const element = p[index];
                const existingItem = existing[index] ??= {};
                Cloner.copyProperties(element, existingItem);
                this.clone(element, existingItem, others);
            }
            return existing;
        }

        p = Cloner.copyProperties(p, dest[name] ?? undefined);
        dest[name] = p;
        this.clone(original, p, others);
        return dest;
    }

}

export class PropertyCloner<T, TPrevious> extends Cloner<T> {

    constructor(item: T, path: PropertyPath[], private propertyPath: PropertyPath) {
        super(item, path);
    }

    public thenInclude<TProperty>(
        property: (item: TPrevious) => ICollection<TProperty> | TProperty): PropertyCloner<T, TProperty>;
    public thenInclude<TProperty>(property: any): PropertyCloner<T, TProperty> {
        this.propertyPath.push(property);
        return new PropertyCloner(this.item, this.path, this.propertyPath);
    }

}
