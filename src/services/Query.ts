import { CancelToken } from "@web-atoms/core/dist/core/types";
import IPagedList from "../models/IPagedList";
import type BaseEntityService from "./BaseEntityService";
import type { IListParams, IPagedListParams, IQueryMethod } from "./BaseEntityService";
import resolve from "./resolve";
import StringHelper from "./StringHelper";

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
    return x.replace(/\s+/g, " ").replace(/CastAs\_[0-9]\.default\./i, "CastAs.");
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
            return new Query(this.ec, this.name, append(this.methods, ["where", text, ...pl] ), this.traceQuery);
        }

        const p = tOrP as any;
        text = q(p).toString();
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
        return new Query(this.ec, this.name, append(this.methods, ["where", text, ...pl] ), this.traceQuery);
    }

    public select<TR>(q: (x: T) => TR): Query<TR>;
    public select<TP, TR>(tp: TP, q: (p: TP) => (x: T) => TR): Query<TR>;
    public select<TP, TR>(tOrP: TP | ((x: T) => TR), q?: (p: TP) => (x: T) => TR): Query<TR> {

        if (arguments.length === 1) {
            const select = convertToLinq(tOrP.toString());
            return new Query(this.ec, this.name, append(this.methods, ["select", select] ), this.traceQuery);
        }

        const pl = [];
        let i = 0;
        let text: string = "x => ";
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
        text = convertToLinq(text);
        return new Query(this.ec, this.name, append(this.methods, ["select", text, ...pl] ), this.traceQuery);
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

    public async firstOrDefault(cancelToken?: CancelToken): Promise<T> {
        const list = await this.toPagedList({
            size: 1,
            cancelToken
        });
        return list.items[0];
    }

    public orderBy(filter: (i: T) => any): Query<T> {
        const text = convertToLinq(filter.toString());
        return new Query(this.ec, this.name, append(this.methods, ["orderBy", text]), this.traceQuery);
    }

    public orderByDescending(filter: (i: T) => any): Query<T> {
        const text = convertToLinq(filter.toString());
        return new Query(this.ec, this.name, append(this.methods, ["orderByDescending", text]), this.traceQuery);
    }

    public thenBy(filter: (i: T) => any): Query<T> {
        const text = convertToLinq(filter.toString());
        return new Query(this.ec, this.name, append(this.methods, ["thenBy", text]), this.traceQuery);
    }

    public thenByDescending(filter: (i: T) => any): Query<T> {
        const text = convertToLinq(filter.toString());
        return new Query(this.ec, this.name, append(this.methods, ["thenByDescending", text]), this.traceQuery);
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
        cancelToken, doNotResolve, hideActivityIndicator, cacheSeconds
    }: IListParams = {}): Promise<T[]> {
        const r = await this.toPagedList({ size: -1, cacheSeconds, cancelToken, doNotResolve, hideActivityIndicator });
        return r.items;
    }

    public toPagedList(
        {
            start = 0,
            size = 100,
            cancelToken,
            hideActivityIndicator,
            splitInclude = false,
            cacheSeconds = 0
        }: IPagedListParams = {}): Promise<IPagedList<T>> {
        const  methods = encodeURIComponent(JSON.stringify(this.methods));
        const trace = this.traceQuery ? "true" : "false";
        let url;
        if (cacheSeconds > 0) {
            url  = `${this.ec.url}cached/${this.name}/${methods}/${
                start}/${size}/${splitInclude}/${trace}/${cacheSeconds}`;
        } else {
        url  = `${this.ec.url}methods/${this.name}?methods=${methods}&start=${
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

}
