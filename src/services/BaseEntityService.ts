import { CancelToken } from "@web-atoms/core/dist/core/types";
import DISingleton from "@web-atoms/core/dist/di/DISingleton";
import { Inject } from "@web-atoms/core/dist/di/Inject";
import IClrEntity from "../models/IClrEntity";
import IEntityModel, { EntityContext } from "../models/IEntityModel";
import EntityRestService, { IModifications, IQueryFilter } from "./EntityRestService";
import HttpSession from "./HttpSession";
import Query from "./Query";

const replacer = /(===)|(!==)|(\(\{)|(\.(some|map|filter|find)\s*\()|(\.[a-z])|([a-zA-Z0-9]+\s*\:)/g;

export const convertToLinq = (x: string) => {
    x = x.replace(replacer, (s) => {
        switch (s) {
            case "===": return "==";
            case "!==": return "!=";
            case "({": return "( new {";
            case ".some(": return ".Any(";
            case ".some (": return ".Any(";
            case ".map(": return ".Select(";
            case ".map (": return ".Select(";
            case ".filter(": return ".Where(";
            case ".filter (": return ".Where(";
            case ".find(": return ".FirstOrDefault(";
            case ".find (": return ".FirstOrDefault(";
            case ".includes(": return ".Contains(";
            case ".includes (": return ".Contains(";
        }
        if (s.endsWith(":")) {
            return s.substring(0, s.length - 1) + " = ";
        }
        return s.toUpperCase();
    });
    // reduce white space...
    return x.replace(/\s+/g, " ");
};

export interface ICollection<T> extends Array<T> {
    where?(filter: (item: T) => boolean): ICollection<T>;
    any?(filter: (item: T) => boolean): boolean;
    select?<TR>(select: (item: T) => TR): ICollection<TR>;
    firstOrDefault?(filter: (item: T) => boolean): T;
    count?(filter?: (item: T) => boolean): number;
    toArray?(): ICollection<T>;
    toList?(): ICollection<T>;
    orderBy?(item: (item: T) => any): ICollection<T>;
    thenBy?(item: (item: T) => any): ICollection<T>;
    orderByDescending?(item: (item: T) => any): ICollection<T>;
    thenByDescending?(item: (item: T) => any): ICollection<T>;
}

const ArrayPrototype = Array.prototype as any;
ArrayPrototype.where = ArrayPrototype.filter;
ArrayPrototype.any = ArrayPrototype.some;
ArrayPrototype.select = ArrayPrototype.map;
ArrayPrototype.firstOrDefault = ArrayPrototype.find;
ArrayPrototype.orderBy = function(f) {
    return this.sort((a, b) => {
        const ak = f(a);
        const bk = f(b);
        if (typeof ak === "string") {
            return ak.toLowerCase().localeCompare((bk as string).toLowerCase());
        }
        return ak - bk;
    });
};
ArrayPrototype.thenBy = ArrayPrototype.orderBy;
ArrayPrototype.orderByDescending = function(f) {
    return this.sort((a, b) => {
        const ak = f(a);
        const bk = f(b);
        if (typeof ak === "string") {
            return bk.toLowerCase().localeCompare((ak as string).toLowerCase());
        }
        return bk - ak;
    });
};
ArrayPrototype.thenByDescending = ArrayPrototype.orderByDescending;
ArrayPrototype.count = function(f) {
    if (!f) {
        return this.length;
    }
    let length = 0;
    for (const iterator of this) {
        if (f(iterator)) {
            length++;
        }
    }
    return length;
};

interface IMethod {
    query: string;
    parameters: any[];
}

export function append<T>(original: T[], item: T) {
    if (original) {
        return [ ... original, item];
    }
    return [item];
}

export interface IQueryMethod {
    select?: [string, ... any[]];
    where?: [string, ... any[]];
    orderBy?: [string, ... any[]];
    orderByDescending?: [string, ... any[]];
    thenBy?: [string, ... any];
    thenByDescending?: [string, ... any[]];
    include?: [string];
}

export interface IListParams {
    cancelToken?: CancelToken;

    /**
     * Query will resolve references by replacing $id attributed objects
     */
    doNotResolve?: boolean;

    /**
     * Do not display activity indicator
     */
    hideActivityIndicator?: boolean;
}
export interface IPagedListParams extends IListParams {
    start?: number;
    size?: number;
}

export interface IModel<T> {
    name: string;
}

export default class BaseEntityService extends HttpSession {

    public url: string = "/api/entity/";

    private entityModel: EntityContext;

    public async model(): Promise<EntityContext> {
        if (this.entityModel) {
            return this.entityModel;
        }
        const c = await this.getJson<IEntityModel[]>(`${this.url}/model`);
        this.entityModel = new EntityContext(c);
        return this.entityModel;
    }

    public query<T extends IClrEntity>(m: IModel<T>): Query<T> {
        return new Query(this, m.name, []);
    }

    public delete(e: IClrEntity): Promise<void> {
        return this.restApi.delete(e);
    }

    public insert(e: IClrEntity): Promise<IClrEntity> {
        return this.restApi.insert(e);
    }

    public save(e: IClrEntity): Promise<IClrEntity> {
        return this.restApi.save(e);
    }

    public async update(e: IClrEntity, update: IModifications): Promise<any> {
        await this.bulkUpdate([e], update);
        for (const key in update) {
            if (Object.prototype.hasOwnProperty.call(update, key)) {
                const element = update[key];
                e[key] = element;
            }
        }
        return e;
    }

    public async bulkUpdate(
        entities: IClrEntity[],
        update: IModifications,
        throwWhenNotFound: boolean = false): Promise<void> {
        const model = await this.model();
        const keys = [];
        for (const iterator of entities) {
            const entityType = model.for(iterator.$type);
            const key = { $type: iterator.$type };
            for (const { name } of entityType.keys) {
                key[name] = iterator[name];
            }
            keys.push(key);
        }
        await this.restApi.bulkSave({ keys, update, throwWhenNotFound });
    }

    public async bulkDelete(
        entities: IClrEntity[],
        throwWhenNotFound: boolean = false): Promise<void> {
        const model = await this.model();
        const keys = [];
        for (const iterator of entities) {
            const entityType = model.for(iterator.$type);
            const key = { $type: iterator.$type };
            for (const { name } of entityType.keys) {
                key[name] = iterator[name];
            }
            keys.push(key);
        }
        await this.restApi.bulkDelete({ keys, throwWhenNotFound });
    }
}
