import CancelToken from "../models/CancelToken";

export type URIWithSearchParams = [string, {[k: string]: any}];

export type StringOrURIWithSearchParams = string | URIWithSearchParams;

export function merge(url: string, extra: StringOrURIWithSearchParams) {
    return url + (typeof extra === "string" ? extra : combine(extra));
}

export function combine([url, params]: URIWithSearchParams) {
    let separator = url.indexOf("?") === -1 ? "?" : "&";
    if (!url.endsWith("&")) {
        url += separator;
        separator = "";
    }
    for (const key in params) {
        if (params.hasOwnProperty(key)) {
            const element = params[key];
            url += separator;
            separator = "&";
            url += `${key}=${encodeURIComponent(element)}`;
        }
    }
    return url;
}

export class TextBody {
    constructor(public readonly text: string) {}

    public toString() {
        return this.text;
    }
}

export interface IHttpRequest extends RequestInit {
    url: string;
    method?: string;
    headers?: any;
    body?: any;
    cancelToken?: CancelToken;
}

export default class HttpSession {

    protected resultConverter = (e) => e;

    protected async fetchJson<T>(options: IHttpRequest): Promise<T> {
        if (options.body) {
            const body = options.body;
            if (body instanceof TextBody) {
                options.body = body.toString();
            } else {
                options.body = JSON.stringify(options.body);
            }
        }
        if (options.cancelToken) {
            const ab = new AbortController();
            options.signal = ab.signal;
            options.cancelToken.registerForCancel(() => {
                ab.abort();
            });
        }
        const response = await fetch(options.url, options);
        const contentType = response.headers.get("Content-Type")?.toString() as string;
        if (contentType && !contentType.includes("/json")) {
            // throw new Error(`Unable to convert to json\r\n${contentType}\r\n${await response.text()}`);
            throw new Error(`Unable to convert to json\r\n${contentType}}`);
        }
        return this.resultConverter(await response.json());
    }

    protected getJson<T>(options: IHttpRequest) {
        options.method = "GET";
        return this.fetchJson<T>(options);
    }

    protected postForm<T>(options: IHttpRequest) {
        options.method = "POST";
        if (options.body) {
            options.body = new TextBody(`formModel=${encodeURIComponent(JSON.stringify(options.body))}`);
        }
        options.headers ??= {};
        options.headers["content-type"] = "application/x-www-form-urlencoded";
        return this.fetchJson<T>(options);
    }

    protected postJson<T>(options: IHttpRequest) {
        options.method = "POST";
        if (options.body) {
            options.body = JSON.stringify(options.body);
        }
        options.headers ??= {};
        options.headers["content-type"] = "application/json";
        return this.fetchJson<T>(options);
    }

    protected deleteJson<T>(options: IHttpRequest) {
        options.method = "DELETE";
        if (options.body) {
            options.body = JSON.stringify(options.body);
        }
        options.headers ??= {};
        options.headers["content-type"] = "application/json";
        return this.fetchJson<T>(options);
    }

    protected putJson<T>(options: IHttpRequest) {
        options.method = "PUT";
        if (options.body) {
            options.body = JSON.stringify(options.body);
        }
        options.headers ??= {};
        options.headers["content-type"] = "application/json";
        return this.fetchJson<T>(options);
    }

}
