import { ICollection } from "../services/BaseEntityService";

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
        let p = property(this.item);
        const original = p;
        if (Array.isArray(p)) {
            p = p.map((i) => Cloner.copyProperties(i));
        } else {
            p = Cloner.copyProperties(p);
        }
        for (const key in this.item) {
            if (Object.prototype.hasOwnProperty.call(this.item, key)) {
                const element = this.item[key] as any;
                if (element === original) {
                    this.value[key] = p;
                    break;
                }
            }
        }
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
        let p = property(this.original);
        const o = p;
        if (Array.isArray(p)) {
            p = p.map((i) => Cloner.copyProperties(i));
        } else {
            p = Cloner.copyProperties(p);
        }
        for (const key in this.original) {
            if (Object.prototype.hasOwnProperty.call(this.original, key)) {
                const element = this.original[key] as any;
                if (element === o) {
                    this.property[key] = p;
                    break;
                }
            }
        }
        return new PropertyCloner(this.value, this.item, o, p);
    }

}
