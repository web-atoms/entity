import { CancelToken } from "@web-atoms/core/dist/core/types";
import DateTime from "@web-atoms/date-time/dist/DateTime";
import { Cloner } from "../models/Cloner";
import IClrEntity, { IClrEntityLike } from "../models/IClrEntity";
import IEntityModel, { EntityContext } from "../models/IEntityModel";
import mergeProperties from "./mergeProperties";
import Query, { IDateRange, IEntityWithDateRange, stepTypes } from "./Query";
import resolve from "./resolve";
import { QueryProcessor } from "./QueryProcessor";
import TaskManager from "../models/TaskManager";
import FetchBuilder from "@web-atoms/core/dist/services/FetchBuilder";

(Symbol as any).asyncDispose ??= Symbol("asyncDispose");
(Symbol as any).dispose ??= Symbol("dispose");
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

const orderBy = function (f) {
    return [].concat(this).sort((a, b) => {
        const ak = f(a);
        const bk = f(b);
        if (typeof ak === "string") {
            return ak.toLowerCase().localeCompare((bk as string).toLowerCase());
        }
        return ak - bk;
    });
};

const orderByDescending = function (f) {
    return [].concat(this).sort((a, b) => {
        const ak = f(a);
        const bk = f(b);
        if (typeof ak === "string") {
            return bk.toLowerCase().localeCompare((ak as string).toLowerCase());
        }
        return bk - ak;
    });
};

Object.defineProperties(ArrayPrototype, {
    where: {
        enumerable: false,
        value: ArrayPrototype.filter,
        configurable: true
    },
    any: {
        enumerable: false,
        value: ArrayPrototype.some,
        configurable: true
    },
    select: {
        enumerable: false,
        value: ArrayPrototype.map,
        configurable: true
    },
    selectMany: {
        enumerable: false,
        value(x) {
            const r = [];
            for (const iterator of this) {
                const items = x(iterator);
                if (Array.isArray(items)) {
                    r.push(... items);
                }
            }
            return r;        
        },
        configurable: true
    },
    firstOrDefault: {
        enumerable: false,
        value(f) {
            if (f) {
                return ArrayPrototype.find.apply(this, arguments);
            }
            return this[0];        
        },
        configurable: true
    },
    sum: {
        enumerable: false,
        value(f) {
            let n = 0;
            for (const iterator of this) {
                n += f(iterator) ?? 0;
            }
            return n;        
        },
        configurable: true
    },
    average: {
        enumerable: false,
        value(f) {
            if (this.length === 0) {
                return 0;
            }
            let n = 0;
            for (const iterator of this) {
                n += f(iterator) ?? 0;
            }
            return n / this.length;        
        },
        configurable: true
    },
    orderBy: {
        enumerable: false,
        value: orderBy,
        configurable: true
    },
    thenBy: {
        enumerable: false,
        value: orderBy,        configurable: false
    },
    orderByDescending: {
        enumerable: false,
        value: orderByDescending,
        configurable: true
    },
    thenByDescending: {
        enumerable: false,
        value: orderByDescending,
        configurable: false
    },
    count: {
        enumerable: false,
        value(f) {
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
        },
        configurable: false
    }

});

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
    length?: number;
    dataType?: string;
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
    queries?: { [key: string]: any };
    actions?: { [key: string]: any };
}

export interface IModel<T, TQ = any, TA = any> {
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

export type IPrimitive = string | null | number | boolean;

export default abstract class BaseEntityService extends TaskManager {

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
        using busy = this.createBusyIndicator(false);
        const c = await FetchBuilder.get(`${this.url}model`)
            .asJson<IEntityModel[]>();
        this.entityModel = new EntityContext(c);
        return this.entityModel;
    }

    public dateRange(start: DateTime, end: DateTime, step: stepTypes ): Query<IDateRange> {
        return new Query({ service: this, name: "NeuroSpeech.EntityAccessControl.DateRange", traceQuery: false},
            [
                ["dateRange", "@0,@1,@2", start, end, step]
            ]);
    }

    query<T extends IClrEntity, TR>(m: IModel<T, TR>,
            queryFunction?: keyof TR,
            ... args: IPrimitive[]): Query<T> {
        return new Query({
            service: this,
            name: m.name,
            queryProcessor: this.queryProcessor,
            queryFunction: queryFunction as any,
            args
        });
    }

    queryNavigation<T extends IClrEntity, PR extends keyof T>(entity: T, navigation: PR): Query<T[PR]> {
    const name = entity.$type;
    const { $key } = entity;
    return new Query({
        service: this,
        name,
        entityKey: $key,
        navigation: navigation as string
    });
}

    queryEntity<T extends IClrEntity, TR>(m: IModel<T, TR>,
        entity: T,
        queryFunction?: keyof TR,
        ... args: IPrimitive[]): Query<T> {
        let entityKey;
        const { $key } = entity;
        if (!$key) {
            throw new Error(`Entity does not contain public/private key`);
        }
        entityKey = $key;
        return new Query({
            service: this,
            name: m.name,
            queryProcessor: this.queryProcessor,
            queryFunction: queryFunction as any,
            entityKey,
            args
        });
    }

    as<TR>() {
        return this as any as Query<TR>;
    }

    async delete<T extends IClrEntity>(body: T): Promise<void> {
        using busy = this.createBusyIndicator(false);
        const url = this.url;
        // return this.deleteJson({url, body});
        return await FetchBuilder.delete(url).jsonBody(body).asJson();
    }

    async insert(body: IClrEntity): Promise<IClrEntity> {
        using busy = this.createBusyIndicator(false);
        const url = this.url;
        // return this.putJson({url, body});
        const result = await FetchBuilder.put(url).jsonBody(body).asJson();
        return this.resultConverter(result);
    }

    async invoke<T extends IClrEntity, TA, TQ>(m: IModel<T, TQ, TA>, method: keyof TA, argEntity: Partial<T>, ... args: any[]) {
        using busy = this.createBusyIndicator(false);
        // will send keys only...
        const entity = {
            $type: m.name
        };
        for(const key of m.schema.keys) {
            entity[key.name] = argEntity[key.name];
        }

        const result = await FetchBuilder.post(`${this.url}invoke/${entity.$type}/${method as any}`)
            .withFetchProxy((r, i) => this.queueRun(() => fetch(r, i)))
            .jsonBody({ entity, args })
            .asJson<T>();

        return this.resultConverter(result);

        // return this.postJson({
        //     url: `${this.url}invoke/${entity.$type}/${method as any}`,
        //     method: "POST",
        //     body: {
        //         entity,
        //         args
        //     }
        // }) as Promise<T>;
    }

    buildRunUrl<T extends IClrEntity, TA, TQ>(m: IModel<T, TQ, TA>, method: keyof TA, argEntity: Partial<T>, {
        args = void 0 as any[],
        cacheSeconds = 0,
        cacheVersion = void 0 as any
    } = {
    }) {
        const { $type, $key } = argEntity;
        if (!$key) {
            throw new Error(`Run requires encrypted $key`);
        }
        const usp = new URLSearchParams();
        usp.append("key", $key);
        if (args) {
            usp.append("args", JSON.stringify(args));
        }
        if (cacheSeconds) {
            usp.append("cache", cacheSeconds.toString());
        }
        if (cacheVersion) {
            usp.append("cv", cacheVersion);
        }
        return `${this.url}run/${$type}/${method as any}?${usp.toString()}`;
    }

    /**
     * This method will execute external function for the enityt that has $key included.
     * @param m model
     * @param method extenral method name
     * @param argEntity entity
     * @param param3
     * @returns 
     */
    run<T extends IClrEntity, TA, TQ>(m: IModel<T, TQ, TA>, method: keyof TA, argEntity: Partial<T>, {
        args = void 0 as any[],
        cacheSeconds = 0,
        cacheVersion = void 0 as any
    } = {
    }) {
        const url = this.buildRunUrl(m, method, argEntity, { args, cacheSeconds, cacheVersion });
        return FetchBuilder.get(url)
            .withFetchProxy((r, i) => this.queueRun(() => fetch(r, i)))
            .jsonPostProcessor(this.resultConverter);
    }

    /**
     * This method will execute external function for the entity that does not have $key included.
     * This will cause read filter to be executed before the actual function exectution.
     * @param m model
     * @param method method name
     * @param argEntity entity
     * @param args arguments
     * @returns 
     */
    async runFiltered<T extends IClrEntity, TA, TQ>(m: IModel<T, TQ, TA>, method: keyof TA, argEntity: Partial<T>, ... args: any[]) {
        using busy = this.createBusyIndicator(false);
        // will send keys only...
        const keys = {
        };
        for(const key of m.schema.keys) {
            keys[key.name] = argEntity[key.name];
        }
        
        return FetchBuilder.post(`${this.url}run/${m.name}/${method as any}`)
            .withFetchProxy((r, i) => this.queueRun(() => fetch(r, i)))
            .jsonBody({ keys, args })
            .jsonPostProcessor(this.resultConverter);
    }

    public save<T extends IClrEntity>(body: T, cloner?: (c: Cloner<T>) => Cloner<T>, trace?: boolean): Promise<T>;
    public save<T extends IClrEntity>(body: T[], cloner?: (c: Cloner<T>) => Cloner<T>, trace?: boolean): Promise<T[]>;
    public async save(body: any, cloner?: (c: Cloner<any>) => Cloner<any>, trace?: boolean): Promise<any> {
        if (Array.isArray(body) && body.length === 0) {
            return body;
        }
        using busy = this.createBusyIndicator(false);
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
        // const result = await this.postJson({
        //     url, body
        // });
        let result = await FetchBuilder.post(url)
            .jsonBody(body)
            .asJson();
        result = this.resultConverter(result);
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
        using busy = this.createBusyIndicator(false);
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
        let results = await FetchBuilder.post(url)
            .jsonBody(body)
            .asJson();
        results = this.resultConverter(results);
        return results;
    }

    public async bulkDelete<T extends IClrEntity>(
        entities: T[],
        throwWhenNotFound: boolean = false): Promise<void> {
        const model = await this.model();
        using busy = this.createBusyIndicator(false);
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
        // await this.deleteJson({
        //     url,
        //     body
        // });
        let results = await FetchBuilder.delete(url)
            .jsonBody(body)
            .asJson();
        results = this.resultConverter(results);
        return results;
    }

    // protected async fetchResponse<T>(options: IHttpRequest): Promise<T> {
    //     if (!this.createBusyIndicator || options?.hideActivityIndicator) {
    //         return await super.fetchResponse(options);
    //     }
    //     const disposable = this.createBusyIndicator(options);
    //     try {
    //         return await super.fetchResponse(options);
    //     } finally {
    //         disposable?.dispose();
    //     }
    // }

    protected createBusyIndicator(hideActivityIndicator = false) {
        return { [Symbol.dispose]() {}};
    }
}

// @ts-expect-error
delete BaseEntityService.prototype.createBusyIndicator;
