import { ICollection } from "../services/BaseEntityService";

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

/* eslint-disable @typescript-eslint/unified-signatures */
export class Cloner<T> {

    protected static copyProperties(src) {
        if (Array.isArray(src)) {
            return src.map((i) => Cloner.copyProperties(i));
        }
        const dest = {};
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

    public get copy() {
        return this.value;
    }

    constructor(protected item: T, protected value?: T) {
        this.value = this.value ?? Cloner.copyProperties(item);
    }

    public include<TProperty>(property: (item: T) => ICollection<TProperty>): PropertyCloner<T, TProperty>;
    public include<TProperty>(property: (item: T) => TProperty[]): PropertyCloner<T, TProperty>;
    public include<TProperty>(property: (item: T) => TProperty): PropertyCloner<T, TProperty>;
    public include<TProperty>(property: any): PropertyCloner<T, TProperty> {
        if (!this.item) {
            return new PropertyCloner(this.value, this.item, undefined, undefined);
        }
        let p = property(this.item);
        const original = p;
        const keyName = getKey(this.item, original);
        const clone = this.value[keyName];
        if (clone !== void 0) {
            return new PropertyCloner(this.value, this.item, original, clone);
        }
        if (Array.isArray(p)) {
            p = p.map((i) => Cloner.copyProperties(i));
        } else {
            p = Cloner.copyProperties(p);
        }
        this.value[keyName] = p;
        return new PropertyCloner(this.value, this.item, original, p);
    }

}

export class PropertyCloner<T, TPrevious> extends Cloner<T> {

    constructor (copy: T, item: T, private original: TPrevious, private property: TPrevious) {
        super(item, copy);
    }

    public thenInclude<TProperty>(property: (item: TPrevious) => ICollection<TProperty>): PropertyCloner<T, TProperty>;
    public thenInclude<TProperty>(property: (item: TPrevious) => TProperty[]): PropertyCloner<T, TProperty>;
    public thenInclude<TProperty>(property: (item: TPrevious) => TProperty): PropertyCloner<T, TProperty>;
    public thenInclude<TProperty>(property: any): PropertyCloner<T, TProperty> {
        if (!this.original) {
            return new PropertyCloner(this.value, this.item, undefined, undefined);
        }
        let p = property(this.original);
        const o = p;
        const keyName = getKey(this.property, o);
        const clone = this.property[keyName];
        if (clone !== void 0) {
            return new PropertyCloner(this.value, this.item, o, clone);
        }
        if (Array.isArray(p)) {
            p = p.map((i) => Cloner.copyProperties(i));
        } else {
            p = Cloner.copyProperties(p);
        }
        this.property[keyName] = p;
        return new PropertyCloner(this.value, this.item, o, p);
    }

}
