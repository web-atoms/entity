import { App } from "@web-atoms/core/dist/App";
import { CancelToken } from "@web-atoms/core/dist/core/types";
import { Inject } from "@web-atoms/core/dist/di/Inject";
import { Cloner } from "../models/Cloner";
import IClrEntity from "../models/IClrEntity";
import IEntityModel, { EntityContext } from "../models/IEntityModel";
import HttpSession, { IHttpRequest } from "./HttpSession";
import Query from "./Query";
import resolve from "./resolve";

export interface ICollection<T> extends Array<T> {
    sum?(filter: (item: T) => number): number;
    avg?(filter: (item: T) => number): number;
    where?(filter: (item: T) => boolean): ICollection<T>;
    any?(filter: (item: T) => boolean): boolean;
    select?<TR>(select: (item: T) => TR): ICollection<TR>;
    selectMany?<TR>(select: (item: T) => TR[]): ICollection<TR>;
    firstOrDefault?(filter?: (item: T) => boolean): T;
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
ArrayPrototype.selectMany = function(x) {
    const r = [];
    for (const iterator of this) {
        const items = x(iterator);
        if (Array.isArray(items))
            r.push(... items);
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
ArrayPrototype.avg = function(f) {
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
    | ["orderBy", string, ... any[]]
    | ["orderByDescending", string, ... any[]]
    | ["thenBy", string, ... any[]]
    | ["thenByDescending", string, ... any[]]
    | ["include", string]
    | ["thenInclude", string];

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
     * Split server side includes
     */
    splitInclude?: boolean;
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

    protected resultConverter = resolve;

    private entityModel: EntityContext;

    @Inject
    private app: App;

    public cloner<T>(item: T): Cloner<T> {
        return new Cloner(item);
    }

    public async model(): Promise<EntityContext> {
        if (this.entityModel) {
            return this.entityModel;
        }
        const c = await this.getJson<IEntityModel[]>({ url: `${this.url}/model` });
        this.entityModel = new EntityContext(c);
        return this.entityModel;
    }

    public query<T extends IClrEntity>(m: IModel<T>): Query<T> {
        return new Query(this, m.name, [], false);
    }

    public delete(body: IClrEntity): Promise<void> {
        const url = this.url;
        return this.deleteJson({url, body});
    }

    public insert(body: IClrEntity): Promise<IClrEntity> {
        const url = this.url;
        return this.putJson({url, body});
    }

    public save<T extends IClrEntity>(body: T): Promise<T>;
    public save<T extends IClrEntity>(body: T[]): Promise<T[]>;
    public save(body: any): Promise<any> {
        const url = this.url;
        return this.postJson({url, body});
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
        const body = { keys, update, throwWhenNotFound };
        const url = `${this.url}/bulk`;
        await this.putJson({url, body});
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
        const url = `${this.url}/bulk`;
        const body = { keys, throwWhenNotFound };
        await this.deleteJson({
            url,
            body
        });
    }

    protected async fetchJson<T>(options: IHttpRequest): Promise<T> {
        const app = this.app;
        if (!app) {
            return super.fetchJson(options);
        }
        const disposable = app.createBusyIndicator({ title: options.url });
        try {
            return await super.fetchJson(options);
        } finally {
            disposable?.dispose();
        }
    }
}
