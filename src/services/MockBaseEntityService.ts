import { CancelToken } from "@web-atoms/core/dist/core/types";
import IClrEntity from "../models/IClrEntity";
import { EntityContext } from "../models/IEntityModel";
import IPagedList from "../models/IPagedList";
import BaseEntityService, { IBulkDeleteModel, IBulkUpdateModel, IModel, IQueryMethod } from "./BaseEntityService";
import Query from "./Query";

const replacer = /(\.[a-z0-9\_])|([a-z0-9\_]\())/ig;

const convertToSafe = (text: string) => {
    return text.replace(replacer, (x) => {
        if (x.endsWith("(")) {
            return x[0] + "?.(";
        }
        return "?" + x;
    });
};

function sleep(n) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, n);
    });
}

export class EntitySet<T> {

    public readonly name: string;

    public get all() {
        const a = [];
        for (const key in this.primary) {
            if (Object.prototype.hasOwnProperty.call(this.primary, key)) {
                const element = this.primary[key];
                a.push(element);
            }
        }
        return a;
    }

    private primary: {[key: string]: T} = {};

    constructor(model: IModel<T>, protected readonly entityService: MockBaseEntityService) {
        this.name = model.name;
    }

    public add(... items: Array<Partial<T>>) {
        for (const item of items) {
            this.save(item as any);
        }
    }

    public save(item: T) {
        const model = this.entityService.entityContext.for(this.name);
        const keys = this.keys(item);
        const existing = this.find(keys);
        if (existing) {
            for (const key in item) {
                if (Object.prototype.hasOwnProperty.call(item, key)) {
                    const element = item[key];
                    existing[key] = element;
                }
            }
            return;
        }
        for (const property of model.properties) {
            if (!item.hasOwnProperty(property.name)) {
                item[property.name] = null;
            }
        }
        this.primary[JSON.stringify(keys)] = item;
    }

    public delete(item: T) {
        const model = this.entityService.entityContext.for(this.name);
        const keys = this.keys(item);
        delete this.primary[JSON.stringify(keys)];
    }

    public keys(item: T) {
        const model = this.entityService.entityContext.for(this.name);
        const keys = [];
        for (const iterator of model.keys) {
            keys.push(item[iterator.name]);
        }
        return keys;
    }

    public find(keys: any[]) {
        const key = JSON.stringify(keys);
        return this.primary[key];
    }

}

class MockEntityRestService {

    constructor(private es: MockBaseEntityService) {}

    public async query(
        entity: string,
        methods: {
            methods: IQueryMethod[],
            start: number,
            size: number
        },
        ct: CancelToken
    ): Promise<IPagedList<IClrEntity>> {
        await sleep(200);
        if (ct.cancelled) {
            throw new Error("cancelled");
        }
        const model = this.es.entityContext.for(entity);
        let all = this.es.set({ name: entity}).all;
        for (const iterator of methods.methods) {
            for (const key in iterator) {
                if (Object.prototype.hasOwnProperty.call(iterator, key)) {
                    const [expression, ... pl] = iterator[key];
                    let fx = convertToSafe(expression) as any;
                    for (let index = 0; index < pl.length; index++) {
                        fx = fx.replaceAll(`@${index}`, `p[${index}]`);
                    }
                    // tslint:disable-next-line: no-eval
                    fx = eval(`(p) => ${fx}`)(pl);
                    // tslint:disable-next-line: ban-types
                    all = (all[key] as Function).apply(all, fx);
                }
            }
        }
        const total = all.length;
        if (methods.start) {
            while (methods.start > 0) {
                all = all.shift();
            }
        }
        if (methods.size) {
            all.length = methods.size;
        }
        return Promise.resolve({
            items: all,
            total
        });
    }

    public async insert(body: IClrEntity): Promise<IClrEntity> {
        await sleep(100);
        this.es.set({ name: body.$type}).add(body);
        return Promise.resolve(body);
    }

    public async save(body: IClrEntity): Promise<IClrEntity> {
        await sleep(100);
        this.es.set({ name: body.$type}).add(body);
        return Promise.resolve(body);
    }

    public async delete(body: IClrEntity): Promise<void> {
        await sleep(100);
        this.es.set({ name: body.$type}).delete(body);
        return Promise.resolve();
    }

    public async bulkSave(body: IBulkUpdateModel): Promise<void> {
        await sleep(100);
        for (const entity of body.keys) {
            const model = this.es.set({ name: entity.$type});
            const keys = model.keys(entity);
            const existing = model.find(keys);
            if (existing) {
                for (const key in body.update) {
                    if (Object.prototype.hasOwnProperty.call(body.update, key)) {
                        const element = body.update[key];
                        existing[key] = element;
                    }
                }
            }
        }
        return Promise.resolve();
    }

    public async bulkDelete(body: IBulkDeleteModel): Promise<void> {
        await sleep(100);
        for (const entity of body.keys) {
            const model = this.es.set({ name: entity.$type});
            model.delete(entity);
        }
        return Promise.resolve();
    }

}

export default class MockBaseEntityService extends BaseEntityService {

    public entityContext: EntityContext;

    private local: { [key: string]: any } = {};

    public seed() {
        // tslint:disable-next-line: no-console
        console.warn("Please override seed method for data");
    }

    public set<T>(m: IModel<T>): EntitySet<T> {
        return this.local[m.name] ??= new EntitySet(m, this);
    }
}
