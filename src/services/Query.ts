import { CancelToken } from "@web-atoms/core/dist/core/types";
import IPagedList from "../models/IPagedList";
import BaseEntityService, {
    append, convertToLinq, IListParams, IPagedListParams, IQueryMethod } from "./BaseEntityService";
import resolve from "./resolve";
import StringHelper from "./StringHelper";

export default class Query<T> {

    constructor(
        private ec: BaseEntityService,
        private name: string,
        private methods: IQueryMethod[]
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
            return new Query(this.ec, this.name, append(this.methods, { where: [text, ...pl] }));
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
        text = convertToLinq(text);
        return new Query(this.ec, this.name, append(this.methods, { where: [text, ...pl] }));
    }

    public select<TR>(q: (x: T) => TR): Query<TR>;
    public select<TP, TR>(tp: TP, q: (p: TP) => (x: T) => TR): Query<TR>;
    public select<TP, TR>(tOrP: TP | ((x: T) => TR), q?: (p: TP) => (x: T) => TR): Query<TR> {

        if (arguments.length === 1) {
            const select = convertToLinq(tOrP.toString());
            return new Query(this.ec, this.name, append(this.methods, { select: [select] }));
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
        return new Query(this.ec, this.name, append(this.methods, { select: [text, ...pl] }));
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
        return new Query(this.ec, this.name, append(this.methods, { where: [filters, ...params] }));
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
        return new Query(this.ec, this.name, append(this.methods, { select: [filters, ...params] }));
    }

    public include<P extends keyof T>(...n: P[]): Query<T> {
        const names = n as any;
        let start = this.methods;
        for (const iterator of n) {
            start = append(start, { include: [iterator.toString()] });
        }
        return new Query(this.ec, this.name, start);
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
        return new Query(this.ec, this.name, append(this.methods, { orderBy: [text] }));
    }

    public orderByDescending(filter: (i: T) => any): Query<T> {
        const text = convertToLinq(filter.toString());
        return new Query(this.ec, this.name, append(this.methods, { orderByDescending: [text] }));
    }

    public thenBy(filter: (i: T) => any): Query<T> {
        const text = convertToLinq(filter.toString());
        return new Query(this.ec, this.name, append(this.methods, { thenBy: [text] }));
    }

    public thenByDescending(filter: (i: T) => any): Query<T> {
        const text = convertToLinq(filter.toString());
        return new Query(this.ec, this.name, append(this.methods, { thenByDescending: [text] }));
    }

    /**
     * Warning, will return all the items from the query, please use `toPagedList`
     * for better performance
     * @param cancelToken Cancel Token to cancel the query
     * @returns Promise<T[]>
     */
    public async toArray({
        cancelToken, doNotResolve, hideActivityIndicator
    }: IListParams = {}): Promise<T[]> {
        const r = await this.toPagedList({ size: -1, cancelToken, doNotResolve, hideActivityIndicator });
        return r.items;
    }

    public toPagedList(
        {
            start = 0, size = 100, cancelToken, hideActivityIndicator
        }: IPagedListParams = {}): Promise<IPagedList<T>> {
        const  methods = encodeURIComponent(JSON.stringify(this.methods));
        return (this.ec as any).getJson({
            url: `${this.ec.url}methods/${this.name}?methods=${methods}$start=${start}&size=${size}`,
            cancelToken
        });
    }

}
