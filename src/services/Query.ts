import { CancelToken } from "@web-atoms/core/dist/core/types";
import DateTime from "@web-atoms/date-time/dist/DateTime";
import IPagedList from "../models/IPagedList";
import type BaseEntityService from "./BaseEntityService";
import type { ICollection, IListParams, IPagedListParams, IQueryMethod } from "./BaseEntityService";
import HttpSession from "./HttpSession";
import resolve from "./resolve";
import StringHelper from "./StringHelper";

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

interface IEntityWithDateRange<T> {
    entity: T,
    range: {
        startDate: DateTime,
        endDate: DateTime
    }
}

export default class Query<T> {

    constructor(
        private ec: BaseEntityService,
        private name: string,
        private methods: IQueryMethod[],
        private traceQuery: boolean
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
        step: "Day" | "Month" | "Year" | "Week" | "Hour"): Query<IEntityWithDateRange<T>> {
        return new Query(
            this.ec,
            this.name,
            append(this.methods, ["joinDateRange", "@0,@1,@2", start, end, step] ), this.traceQuery) as any;
    }

    public select<TR>(q: (x: T) => TR): Query<TR>;
    public select<TP, TR>(tp: TP, q: (p: TP) => (x: T) => TR): Query<TR>;
    public select<TP, TR>(tOrP: TP | ((x: T) => TR), q?: (p: TP) => (x: T) => TR): Query<TR> {
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
        return new Query(this.ec, this.name, append(this.methods, ["where", filters, ...params]), this.traceQuery);
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
        return new Query(this.ec, this.name, append(this.methods, ["select", filters, ...params] ), this.traceQuery);
    }

    public include<TR>(q: (x: T) => TR[]): IIncludedArrayQuery<T, TR, TR[]>;
    public include<TR>(q: (x: T) => TR): IIncludedQuery<T, TR>;
    public include<TR>(... q: string[]): Query<T>;
    public include<TR>(tOrP: ((x: T) => any) | string, ... q: string[]): IIncludedQuery<T, TR> | Query<T> {
        if (typeof tOrP === "string") {
            return new Query(this.ec, this.name, append(
                this.methods,
                ["include", tOrP],
                ... q.map((s) => ["include", s] as IQueryMethod)
                ), this.traceQuery) as any;
        }
        const select = convertToLinq(tOrP.toString());
        return new Query(this.ec, this.name, append(this.methods, ["include", select] ), this.traceQuery) as any;
    }

    public async firstOrDefault(p: IListParams = {}): Promise<T> {
        const lp = p as IPagedListParams;
        lp.size = 1;
        lp.start = 0;
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
        return new Query(this.ec, this.name, this.methods, true);
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
            cacheSeconds = 0
        }: IPagedListParams = {}): Promise<IPagedList<T>> {
        let url;
        const trace = this.traceQuery ? "true" : "false";
        const methods = JSON.stringify(this.methods);
        const encodedMethods = encodeURIComponent(methods);
        if (encodedMethods.length > 1824) {
            if (cacheSeconds > 0) {
                throw new Error("Generated query too big for caching");
            }
            url = `${this.ec.url}methods/${this.name}`;
            return (this.ec as any).postJson({
                url,
                cancelToken,
                body: {
                    methods,
                    start,
                    size,
                    splitInclude,
                    trace
                }
            });
        }
        if (cacheSeconds > 0) {
            url  = `${this.ec.url}methods/${this.name}?methods=${encodedMethods}&start=${
                start}&size=${size}&trace=${trace}&cacheSeconds=${cacheSeconds}&cacheVersion=${cacheVersion}`;
        } else {
            url  = `${this.ec.url}methods/${this.name}?methods=${encodedMethods}&start=${
                start}&size=${size}&trace=${trace}`;
        }
        return (this.ec as any).getJson({
            url,
            cancelToken
        });
    }

    protected thenInclude(a): any {
        const select = convertToLinq(a.toString());
        return new Query(this.ec, this.name, append(this.methods, ["thenInclude", select] ), this.traceQuery);
    }

    private process<TP, TR>(name: any, tOrP: TP | T, q?: (p: TP) => (x: T) => TR): Query<T> {

        if (!q) {
            const select = convertToLinq(tOrP.toString());
            return new Query(this.ec, this.name, append(this.methods, [name , select] ), this.traceQuery);
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
        return new Query(this.ec, this.name, append(this.methods, [name , text, ...pl] ), this.traceQuery);
    }

}
