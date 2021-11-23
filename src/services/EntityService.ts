import { CancelToken } from "@web-atoms/core/dist/core/types";
import DISingleton from "@web-atoms/core/dist/di/DISingleton";
import { Inject } from "@web-atoms/core/dist/di/Inject";
import IClrEntity from "../models/IClrEntity";
import { EntityContext } from "../models/IEntityModel";
import IPagedList from "../models/IPagedList";
import EntityRestService, { IQueryFilter } from "./EntityRestService";

interface IMethod {
    query: string;
    parameters: any[];
}

function append<T>(original: T[], item: T) {
    if (original) {
        return [ ... original, item];
    }
    return [item];
}

class StringHelper {

    public static findParameter(f: any): string {
        let text: string = f.toString();
        let i = text.indexOf("(");
        text = text.substring(i + 1);
        i = text.indexOf(")");
        return text.substring(0, i);
    }

    public static contains(left: string, right: string): boolean {
    if (!left) {
            return !right;
        }
    return left.toLowerCase().includes(right.toLowerCase());
    }

}

export class Query<T extends IClrEntity> {

    constructor(
        private ec: EntityService,
        private name: string,
        private filter: IMethod[] = null,
        private orderBys: string = null,
        private includeProps: string[] = null) {
    }

    public where(p: Omit<T, "$type">): Query<T>;
    public where<TP>(p: TP, q: (p: TP) => (x: T) => any): Query<T>;
    public where<TP>(tOrP: TP | T, q?: (p: TP) => (x: T) => any): Query<T> {

        const pl = [];
        let i = 0;
        let text: string = "x => ";
        if (arguments.length === 1) {
            for (const key in tOrP as any) {
                if (Object.prototype.hasOwnProperty.call(tOrP, key)) {
                    const element = tOrP[key];
                    text += `${i ? " && " : ""}x.${key} == @${i}`;
                    pl.push(element);
                }
            }
            const fx = { query: text, parameters : pl};
            return new Query(this.ec, this.name,
                append(this.filter, fx) , this.orderBys, this.includeProps );
        }

        const p = tOrP as any;
        text = q(p).toString();
        const x = StringHelper.findParameter(text);
        const pfn = StringHelper.findParameter(q.toString()).trim();
        for (const key in p) {
            if (Object.prototype.hasOwnProperty.call(p, key)) {
                const element = p[key];
                const pn = `@${i++}`;
                text = text.split(`${pfn}.${key}`).join(pn);
                pl.push(element);
            }
        }
        text = text.split(`(${x})`).join(x);
        text = text.split("===").join("==");
        text = text.split("!==").join("!=");
        return new Query(this.ec, this.name,
            append(this.filter, {query: text, parameters: pl}), this.orderBys, this.includeProps);
    }

    public whereLinq(query: TemplateStringsArray, ... args: any[]): Query<T> {
        let filters = "";
        const params = [];
        for (let index = 0; index < args.length; index++) {
            const element = args[index];
            const raw = query.raw[index];
            if (raw) {
                filters += raw;
            }
            const pi = `@${index}`;
            filters += pi;
            params.push(element);
        }
        const last = query.raw[args.length];
        if (last) {
            filters += last;
        }
        return new Query(this.ec, this.name, append(this.filter, { query: filters, parameters: params }),
            this.orderBys,
            this.includeProps);
    }

    public include<P extends keyof T>(... n: P[]): Query<T> {
        const names = n as any;
        return new Query(this.ec, this.name, this.filter,
            this.orderBys,
            this.includeProps
                ? [ ... this.includeProps, ... names ]
                : names);
    }

    public async firstOrDefault(ct?: CancelToken): Promise<T> {
        const list = await this.toPagedList(0, 1, ct);
        return list.items[0];
    }

    public orderBy(text: string): Query<T> {
        return new Query(this.ec, this.name, this.filter, text, this.includeProps);
    }

    public toPagedList(
        start: number = 0,
        size: number = 100,
        ct?: CancelToken): Promise<IPagedList<T>> {
        const filter: IQueryFilter = {
            size,
            start
        };
        if (this.filter && this.filter.length) {
            filter.filter = JSON.stringify(this.filter.map((x) => x.query));
            filter.parameters = JSON.stringify(this.filter.map((x) => x.parameters)) as any;
        }
        if (this.includeProps) {
            filter.include = JSON.stringify(this.includeProps) as any;
        }
        if (this.orderBys) {
            filter.orderBy = this.orderBys;
        }
        return this.ec.entityQuery(this.name, filter, ct);
    }

}

export interface IModel<T> {
    name: string;
}

@DISingleton()
export default class EntityService {

    @Inject
    public restApi: EntityRestService;

    private entityModel: EntityContext;

    public async model(): Promise<EntityContext> {
        if (this.entityModel) {
            return this.entityModel;
        }
        const c = await this.restApi.model();
        this.entityModel = new EntityContext(c);
        return this.entityModel;
    }

    public async get(name: string, query: IQueryFilter, ct?: CancelToken): Promise<IClrEntity> {
        const r = await this.entityQuery(name, query, ct);
        return r.items[0];
    }

    public query<T extends IClrEntity>(m: IModel<T>): Query<T> {
        return new Query(this, m.name);
    }

    public entityQuery<T extends IClrEntity>(
        name: string,
        query: IQueryFilter,
        ct?: CancelToken): Promise<IPagedList<T>> {
        if (typeof query.keys === "object") {
            query.keys = JSON.stringify(query.keys) as any;
        }
        if (typeof query.parameters === "object") {
            query.parameters = JSON.stringify(query.parameters) as any;
        }
        if (typeof(query.include) === "object") {
            query.include = JSON.stringify(query.include) as any;
        }
        return this.restApi.query(name, query, ct) as any;
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

}
