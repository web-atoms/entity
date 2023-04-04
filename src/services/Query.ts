import DateTime from "@web-atoms/date-time/dist/DateTime";
import IPagedList from "../models/IPagedList";
import type BaseEntityService from "./BaseEntityService";
import type { IListParams, IModel, IPagedListParams, IQueryMethod } from "./BaseEntityService";
import StringHelper from "./StringHelper";

export type stepTypes = "Day" | "Month" | "Year" | "Week" | "Hour";

const replacer = /(===)|(!==)|(\(\s*\{)|(\.[a-zA-Z0-9]+)|([a-zA-Z0-9]+\s*\:\s*\{?)/g;

export const convertToLinq = (x: string) => {
    x = x.replace(/(\s+)|((CastAs|EF)\_[0-9]\.default\.)/g, (s, first, second) => {
        if (s === first) {
            return " ";
        }
        if (s.startsWith("EF")) {
            return "EF.";
        }
        if (s.startsWith("CastAs")) {
            return "CastAs.";
        }
        return s;
    });
    replacer.lastIndex = 0;
    x = x.replace(replacer, (s) => {
        switch (s) {
            case "===": return "==";
            case "!==": return "!=";
            case "({": return "( new {";
            case ".some": return ".Any";
            case ".map": return ".Select";
            case ".filter": return ".Where";
            case ".find": return ".FirstOrDefault";
            case ".includes": return ".Contains";
        }
        if (s.endsWith("{")) {
            const index = s.indexOf(":");
            const v = s.substring(0, index) + " = new {";
            return v;
        }
        const trimmed = s.trim();
        if (trimmed.endsWith(":")) {
            return trimmed.substring(0, trimmed.length - 1) + " = ";
        }
        if (s.startsWith(".") && s.length > 2) {
            return s[0] + s[1].toUpperCase() + s.substring(2);
        }
        // return s.toUpperCase();
        return s;
    });
    // reduce white space...
    return x;
};

export function append<T>(original: T[], ... item: T[]) {
    if (original) {
        return [ ... original, ... item];
    }
    return [...item];
}

export interface IIncludedQuery<T, TR> extends Required<Query<T>> {
    thenInclude<TP>(path: (x: TR) => TP): IIncludedQuery<T, TP>;
}

export interface IIncludedArrayQuery<T, TR, TRA extends TR[]> extends Required<Query<T>> {
    thenInclude<TP>(q: (x: TR) => TP[]): IIncludedArrayQuery<T, TP, TP[]>;
    thenInclude<TP>(q: (x: TR) => TP): IIncludedQuery<T, TP>;
}

export type Func<T, TR> = (x: T) => TR;

export type SelectWithFunc<T, TI, TR> = (x: T, y: TI[]) => TR;

export interface IDateRange {
    startDate: DateTime,
    endDate: DateTime
}

export interface IEntityWithDateRange<T> {
    entity: T,
    range: IDateRange
}

export class QueryComposer<Q> {

    private query: string = "p => x => ";
    private parameters: any = {};
    private index = 0;

    constructor(private separator = " || ") {

    }

    public add<P>(p: P, q: (p: P) => (item: Q) => any) {
        if (this.index) {
            this.query += this.separator;
        }
        const suffix = `_${this.index++}`;
        let text = q.toString();
        const pfn = StringHelper.findParameter(text).trim();
        text = text.substring(text.indexOf("=>") + 2);
        const xfn = StringHelper.findParameter(text).trim();
        const target = this.parameters;
        for (const key in p) {
            if (Object.prototype.hasOwnProperty.call(p, key)) {
                const element = p[key];
                const name = `${key}${suffix}`;
                target[name] = element;
                text = text.split(`${pfn}.${key}`).join(`p.${name}`);
                text = text.split(`${xfn}.`).join(`x.`);
            }
        }
        text = text.substring(text.indexOf("=>") + 2);
        this.query += text;
    }

    public asQuery(): any[] {
        return [this.parameters, this.query];
    }

}

interface IQueryContext {
    service: BaseEntityService;
    name: string;
    traceQuery?: boolean;
    queryFunction?: string;
    args?: any[];
}

export default class Query<T> {

    constructor(
        private context: IQueryContext,
        private methods: IQueryMethod[] = []
    ) {
        if (!methods) {
            throw new Error("Methods cannot be empty");
        }
    }

    public where<TR>(q: (x: T) => any): Query<T>;
    public where<TP>(p: TP, q: (p: TP) => (x: T) => any): Query<T>;
    public where<TP>(tOrP: TP | T, q?: (p: TP) => (x: T) => any): Query<T> {
        return this.process("where", tOrP, q) as any;
    }

    public joinDateRange(
        start: DateTime,
        end: DateTime,
        step: stepTypes): Query<IEntityWithDateRange<T>> {
        return this.append(["joinDateRange", "@0,@1,@2", start, end, step] );
    }

    public selectWith<TI, TR>(model: IModel<TI>, q: SelectWithFunc<T, TI, TR>): Query<TR>;
    public selectWith<TI, TR, TP = any>(model: IModel<TI>,tp: TP, q: (p: TP) => SelectWithFunc<T, TI, TR>): Query<TR>;
    public selectWith<TI, TR, TP = any>(
        model: IModel<TI>,
        tOrP: TP | (SelectWithFunc<T, TI, TR>),
        q?: (p: TP) => SelectWithFunc<T, TI, TR>): Query<TR> {
        const nq = this.append(["selectWith" as any, model.name]);
        return nq.process("select", tOrP, q as any) as any;
    }

    public select<TR>(q: (x: T) => TR): Query<TR>;
    public select<TR, TP = any>(tp: TP, q: (p: TP) => (x: T) => TR): Query<TR>;
    public select<TR, TP = any>(tOrP: TP | ((x: T) => TR), q?: (p: TP) => (x: T) => TR): Query<TR> {
        return this.process("select", tOrP, q) as any;
    }

    /**
     * @param args any[]
     * @returns Query<T>
     */
    public whereLinq(query: TemplateStringsArray, ...args: any[]): Query<T> {
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
        // return new Query(this.ec, this.name, append(this.filter, { query: filters, parameters: params }),
        //     this.orderBys,
        //     this.includeProps);
        return this.append(["where", filters, ...params]);
    }

    public selectLinq<TR>(query: TemplateStringsArray, ...args: any[]): Query<TR> {
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
        return this.append(["select", filters, ...params] );
    }

    public join<TInner, TKey>(model: IModel<TInner>, left: (x: T) => TKey, right: (x: T) => TKey)
        : Query<{ entity: T, inner: TInner }> {
        return this.append(["join" as any, model.name, left.toString(), right.toString()] ) as any;
    }

    public include<TR>(q: (x: T) => TR[]): IIncludedArrayQuery<T, TR, TR[]>;
    public include<TR>(q: (x: T) => TR): IIncludedQuery<T, TR>;
    public include<TR>(... q: string[]): Query<T>;
    public include<TR>(tOrP: ((x: T) => any) | string, ... q: string[]): IIncludedQuery<T, TR> | Query<T> {
        if (typeof tOrP === "string") {
            return this.append(
                ["include", tOrP],
                ... q.map((s) => ["include", s] as IQueryMethod)) as any;
        }
        const select = convertToLinq(tOrP.toString());
        return this.append(["include", select] ) as any;
    }

    public async firstOrDefault(p: IListParams = {}): Promise<T> {
        const lp = p as IPagedListParams;
        lp.size = 1;
        lp.start = 0;
        lp.count = false;
        const list = await this.toPagedList(lp);
        return list.items[0];
    }

    public orderBy<TR>(q: (x: T) => TR): Query<T>;
    public orderBy<TP, TR>(p: TP, q: (p: TP) => (x: T) => TR): Query<T>;
    public orderBy<TP, TR>(tOrP: TP | T, q?: (p: TP) => (x: T) => TR): Query<T> {
        return this.process("orderBy", tOrP, q);
    }

    public orderByDescending<TR>(q: (x: T) => TR): Query<T>;
    public orderByDescending<TP, TR>(p: TP, q: (p: TP) => (x: T) => TR): Query<T>;
    public orderByDescending<TP, TR>(tOrP: TP | T, q?: (p: TP) => (x: T) => TR): Query<T> {
        return this.process("orderByDescending", tOrP, q);
    }

    public thenBy<TR>(q: (x: T) => TR): Query<T>;
    public thenBy<TP, TR>(p: TP, q: (p: TP) => (x: T) => TR): Query<T>;
    public thenBy<TP, TR>(tOrP: TP | T, q?: (p: TP) => (x: T) => TR): Query<T> {
        return this.process("thenBy", tOrP, q);
    }

    public thenByDescending<TR>(q: (x: T) => TR): Query<T>;
    public thenByDescending<TP, TR>(p: TP, q: (p: TP) => (x: T) => TR): Query<T>;
    public thenByDescending<TP, TR>(tOrP: TP | T, q?: (p: TP) => (x: T) => TR): Query<T> {
        return this.process("thenByDescending", tOrP, q);
    }

    public trace(): Query<T> {
        this.context.traceQuery = true;
        return this;
    }

    /**
     * Warning, will return all the items from the query, please use `toPagedList`
     * for better performance
     * @param cancelToken Cancel Token to cancel the query
     * @returns Promise<T[]>
     */
    public async toArray({
        cancelToken,
        doNotResolve,
        hideActivityIndicator,
        cacheSeconds,
        cacheVersion
    }: IListParams = {}): Promise<T[]> {
        const r = await this.toPagedList({
            size: -1,
            count: false,
            cacheSeconds,
            cancelToken,
            doNotResolve,
            hideActivityIndicator,
            cacheVersion
        });
        return r.items;
    }

    public toPagedList(
        {
            start = 0,
            size = 100,
            cancelToken,
            cacheVersion = "1",
            hideActivityIndicator,
            splitInclude = false,
            cacheSeconds = 0,
            count = true
        }: IPagedListParams = {}): Promise<IPagedList<T>> {
        let url;

        const {
            traceQuery,
            name,
            service,
            queryFunction,
            args
        } = this.context;

        const trace = traceQuery ? "true" : "false";
        const methods = JSON.stringify(this.methods);
        const fm = new URLSearchParams();
        fm.append("methods", methods);
        if (start) {
            fm.append("start", start.toString());
        }
        if (size) {
            fm.append("size", size.toString());
        }
        fm.append("count", count.toString());
        if(trace) {
            fm.append("trace", trace);
        }
        if (queryFunction) {
            fm.append("function", queryFunction);
            fm.append("args", JSON.stringify(args ?? "[]"));
        }
        const encodedMethods = fm.toString();
        if (encodedMethods.length > 1824) {
            if (cacheSeconds > 0) {
                throw new Error("Generated query too big for caching");
            }
            url = `${service.url}methods/${name}`;
            return (service as any).postJson({
                url,
                cancelToken,
                body: {
                    methods: this.methods,
                    start,
                    size,
                    split: splitInclude,
                    count,
                    trace,
                    function: queryFunction || void 0,
                    arguments: queryFunction ? args : void 0
                }
            });
        }
        if (cacheSeconds > 0) {
            fm.append("cache", cacheSeconds.toString());
            fm.append("cv", cacheVersion);
        } else {
        }
        url  = `${service.url}query/${name}?${fm.toString()}`;
        // @ts-ignore
        return service.getJson({
            url,
            cancelToken,
            hideActivityIndicator
        });
    }

    protected thenInclude(a): any {
        const select = convertToLinq(a.toString());
        return this.append(["thenInclude", select]);
    }

    private append<T>(... methods: IQueryMethod[]) {
        return new Query<T>(this.context, [ ... this.methods, ... methods ]);
    }

    private process<TP, TR>(name: any, tOrP: TP | T, q?: (p: TP) => (x: T) => TR): Query<T> {

        if (!q) {
            const select = convertToLinq(tOrP.toString());
            return this.append<T>([name , select]);
        }

        const pl = [];
        let i = 0;
        const p = tOrP as any;
        let text = q(p).toString();
        const pfn = StringHelper.findParameter(q.toString()).trim();
        for (const key in p) {
            if (Object.prototype.hasOwnProperty.call(p, key)) {
                const element = p[key];
                const pn = `@${i++}`;
                text = text.split(`${pfn}.${key}`).join(pn);
                pl.push(element);
            }
        }
        text = convertToLinq(text);
        return this.append([name , text, ...pl]);
    }

}
