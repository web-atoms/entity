import { CancelToken, IDisposable } from "@web-atoms/core/dist/core/types";
import DateTime from "@web-atoms/date-time/dist/DateTime";
import { Cloner } from "../models/Cloner";
import IClrEntity, { IClrEntityLike, IClrExtendedEntity } from "../models/IClrEntity";
import IEntityModel, { EntityContext } from "../models/IEntityModel";
import HttpSession, { IHttpRequest } from "./HttpSession";
import mergeProperties from "./mergeProperties";
import Query, { IDateRange, IEntityWithDateRange, stepTypes } from "./Query";
import resolve from "./resolve";
import { QueryProcessor } from "./QueryProcessor";

export interface IGeometry {
    latitude: number;
    longitude: number;
    wktString?: string;

    difference?(g: IGeometry): IGeometry;

    intersection?(g: IGeometry): IGeometry;

    union?(g: IGeometry): IGeometry;

    symmetricDifference?(g: IGeometry): IGeometry;

    distance?(g: IGeometry): number;

    isWithinDistance?(g: IGeometry, distance: number): boolean;

    touches?(g: IGeometry): boolean;

    intersects?(g: IGeometry): boolean;

    crosses?(g: IGeometry): boolean;

    within?(g: IGeometry): boolean;

    contains?(g: IGeometry): boolean;

    overlaps?(g: IGeometry): boolean;

    covers?(g: IGeometry): boolean;

    coveredBy?(g: IGeometry): boolean;

}


export interface IKeyCollection<TKey, T> extends ICollection<T> {
    key?: TKey;
}

export interface ICollection<T> extends Array<T> {
    sum?(filter?: (item: T) => number): number;
    min?(filter?: (item: T) => number): number;
    max?(filter?: (item: T) => number): number;
    average?(filter?: (item: T) => number): number;
    groupBy?<TK>(this: ICollection<T>, selector: (item: T) => TK): ICollection<IKeyCollection<TK,T>>;
    where?(filter: (item: T) => boolean): ICollection<T>;
    any?(filter?: (item: T) => boolean): boolean;
    select?<TR>(select: (item: T) => TR): ICollection<TR>;
    selectMany?<TR>(select: (item: T) => TR[]): ICollection<TR>;
    firstOrDefault?(filter?: (item: T) => boolean): T;
    count?(filter?: (item: T) => boolean): number;
    toArray?(): ICollection<T>;
    toList?(): ICollection<T>;
    take?(n: number): ICollection<T>;
    orderBy?(item: (item: T) => any): ICollection<T>;
    thenBy?(item: (item: T) => any): ICollection<T>;
    orderByDescending?(item: (item: T) => any): ICollection<T>;
    thenByDescending?(item: (item: T) => any): ICollection<T>;
}

const ArrayPrototype = Array.prototype as any;
ArrayPrototype.where = ArrayPrototype.filter;
ArrayPrototype.any = ArrayPrototype.some;
ArrayPrototype.select = ArrayPrototype.map;
ArrayPrototype.selectMany = function(x) {
    const r = [];
    for (const iterator of this) {
        const items = x(iterator);
        if (Array.isArray(items)) {
            r.push(... items);
        }
    }
    return r;
};
ArrayPrototype.firstOrDefault = function(f) {
    if (f) {
        return ArrayPrototype.find.apply(this, arguments);
    }
    return this[0];
};
ArrayPrototype.sum = function(f) {
    let n = 0;
    for (const iterator of this) {
        n += f(iterator) ?? 0;
    }
    return n;
};
ArrayPrototype.average = function(f) {
    if (this.length === 0) {
        return 0;
    }
    let n = 0;
    for (const iterator of this) {
        n += f(iterator) ?? 0;
    }
    return n / this.length;
};
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

export interface IMethod {
    select?: [string, ... any[]];
    where?: [string, ... any[]];
    orderBy?: [string, ... any[]];
    orderByDescending?: [string, ... any[]];
    thenBy?: [string, ... any[]];
    thenByDescending?: [string, ... any[]];
}

export interface IMethodsFilter {
    methods: IMethod[];
    start: number;
    size: number;
}

export interface IModifications {
    [key: string]: any;
}

export interface IBulkUpdateModel {
    keys: IClrEntity[];
    update: IModifications;
    throwWhenNotFound?: boolean;
}

export interface IBulkDeleteModel {
    keys: IClrEntity[];
    throwWhenNotFound?: boolean;
}

export type IQueryMethod =
    ["select", string, ... any[]]
    | ["where", string, ... any[]]
    | ["joinDateRange", string, ... any[]]
    | ["orderBy", string, ... any[]]
    | ["orderByDescending", string, ... any[]]
    | ["thenBy", string, ... any[]]
    | ["thenByDescending", string, ... any[]]
    | ["include", string]
    | ["thenInclude", string]
    | ["dateRange", string, ... any[]];

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

    /**
     * Response will include cache-control with given seconds as max age
     */
    cacheSeconds?: number;

    /**
     * Arbitrary cache version to invalidate previous version
     */
    cacheVersion?: string;

    /**
     * True if cacheSeconds is greater than zero, set false to turn it off
     */
    cacheImmutable?: boolean;

    /**
     * Split server side includes
     */
    splitInclude?: boolean;
}
export interface IPagedListParams extends IListParams {
    start?: number;
    size?: number;
    count?: boolean;
}

export interface IColumn {
    name?: string;
    type?: string;
    generated?: string;
    default?: any;
}

export interface IRelation {
    name?: string;
    fkMap?: { fk: string, relatedKey: string }[];
    relatedName?: string;
    isCollection?: boolean;
    isInverse?: boolean;

    relatedModel?: IModel<any>;
}

export interface IModelSchema {
    name: string;
    keys: IColumn[];
    properties: IColumn[];
    relations: IRelation[];
}

export interface IModel<T> {
    name: string;
    create?(properties?: IClrEntityLike<T>): T;
    patch?(original: IClrEntityLike<T>, updates: IClrEntityLike<T>): T;
    schema?: IModelSchema;
}

export class DefaultFactory {
    constructor(public readonly factory: () => any) {}
}

export class Model<T> implements IModel<T> {
    private defaults: [string, any][];
    constructor(
        public name: string,
        public readonly keys: string[] = [],
        defaults: any = null,
        public schema = null as IModelSchema
    ) {
        if (defaults) {
            this.defaults = [];
            for (const key in defaults) {
                if (Object.prototype.hasOwnProperty.call(defaults, key)) {
                    const element = defaults[key];
                    this.defaults.push([key, element]);
                }
            }
        }
    }

    public create(properties: IClrEntityLike<T> = {} as any): T {
        (properties as any).$type = this.name;
        if (this.defaults) {
            for (const [key, value] of this.defaults) {
                if (properties[key] === void 0) {
                    if (value instanceof DefaultFactory) {
                        properties[key] = value.factory();
                    } else {
                        properties[key] = value;
                    }
                }
            }
        }
        return properties as T;
    }

    public patch(original: IClrEntityLike<T>, updates: IClrEntityLike<T>) {
        for (const iterator of this.keys) {
            const originalKey = original[iterator];
            const updatedKey = updates[iterator];
            if (updatedKey && updatedKey !== originalKey) {
                throw new Error(`Cannot update ${iterator} as it is the primary key`)
            }
            updates[iterator] = originalKey;
        }
        return {
            $type: this.name,
            ... updates
        } as T;
    }
}

export default abstract class BaseEntityService extends HttpSession {

    public url: string = "/api/entity/";

    public abstract queryProcessor: QueryProcessor;

    protected resultConverter = resolve;

    private entityModel: EntityContext;

    public cloner<T>(item: T): Cloner<T> {
        return new Cloner(item);
    }

    public async model(): Promise<EntityContext> {
        if (this.entityModel) {
            return this.entityModel;
        }
        const c = await this.getJson<IEntityModel[]>({ url: `${this.url}model` });
        this.entityModel = new EntityContext(c);
        return this.entityModel;
    }

    public dateRange(start: DateTime, end: DateTime, step: stepTypes ): Query<IDateRange> {
        return new Query({ service: this, name: "NeuroSpeech.EntityAccessControl.DateRange", traceQuery: false},
            [
                ["dateRange", "@0,@1,@2", start, end, step]
            ]);
    }

    public query<T extends IClrEntity>(m: IModel<T>,
            queryFunction?: string,
            ... args: any[]): Query<T> {
        return new Query({
            service: this,
            name: m.name,
            queryProcessor: this.queryProcessor,
            queryFunction,
            args
        });
    }

    public delete<T extends IClrEntity>(body: T): Promise<void> {
        const url = this.url;
        return this.deleteJson({url, body});
    }

    public insert(body: IClrEntity): Promise<IClrEntity> {
        const url = this.url;
        return this.putJson({url, body});
    }

    public save<T extends IClrEntity>(body: T, cloner?: (c: Cloner<T>) => Cloner<T>, trace?: boolean): Promise<T>;
    public save<T extends IClrEntity>(body: T[], cloner?: (c: Cloner<T>) => Cloner<T>, trace?: boolean): Promise<T[]>;
    public async save(body: any, cloner?: (c: Cloner<any>) => Cloner<any>, trace?: boolean): Promise<any> {
        if (Array.isArray(body) && body.length === 0) {
            return body;
        }
        let url = this.url;
        if (body instanceof Cloner) {
            body = body.copy;
        }
        if (trace) {
            const hasQuery = url.includes("?");
            if (hasQuery) {
                url = url += "&trace=true";
            } else {
                url = url += "?trace=true";
            }
        }
        if (cloner) {
            if (Array.isArray(body)) {
                body = body.map((x) => cloner(new Cloner(x)).copy);
            } else {
                const c = cloner(new Cloner(body));
                body = c.copy;
            }
        }
        const result = await this.postJson({
            url, body
        });
        mergeProperties(result, body);
        return body;
    }

    public async update<T extends IClrEntity>(e: T, update: IModifications): Promise<any> {
        await this.bulkUpdate([e], update);
        for (const key in update) {
            if (Object.prototype.hasOwnProperty.call(update, key)) {
                const element = update[key];
                e[key] = element;
            }
        }
        return e;
    }

    public async bulkUpdate<T extends IClrEntity>(
        entities: T[],
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
        const body = { keys, update, throwWhenNotFound };
        const url = `${this.url}bulk`;
        await this.putJson({url, body});
    }

    public async bulkDelete<T extends IClrEntity>(
        entities: T[],
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
        const url = `${this.url}bulk`;
        const body = { keys, throwWhenNotFound };
        await this.deleteJson({
            url,
            body
        });
    }

    protected async fetchJson<T>(options: IHttpRequest): Promise<T> {
        if (!this.createBusyIndicator || options?.hideActivityIndicator) {
            return await super.fetchJson(options);
        }
        const disposable = this.createBusyIndicator(options);
        try {
            return await super.fetchJson(options);
        } finally {
            disposable?.dispose();
        }
    }

    protected createBusyIndicator(options: IHttpRequest) {
        return { dispose() {}};
    }
}

// @ts-expect-error
delete BaseEntityService.prototype.createBusyIndicator;
