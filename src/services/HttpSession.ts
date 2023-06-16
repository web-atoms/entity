import { CancelToken } from "@web-atoms/core/dist/core/types";
import JsonError from "@web-atoms/core/dist/services/http/JsonError";

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
    hideActivityIndicator?: boolean;
}

export default class HttpSession {

    protected resultConverter = (e) => e;

    protected async fetchJson<T>(options: IHttpRequest): Promise<T> {
        if (options.cancelToken) {
            const ab = new AbortController();
            options.signal = ab.signal;
            options.cancelToken.registerForCancel(() => {
                ab.abort();
            });
        }
        let response: Response;;
        if (this.interceptFetch) {
            response = await this.interceptFetch(options.url, options);
        } else {
            response = await fetch(options.url, options);
        }
        const contentType = response.headers.get("Content-Type")?.toString() as string;
        if (response.status >= 400) {
            if (contentType?.includes("/json")) {
                const error = await response.json();
                throw new JsonError(
                    typeof response === "string"
                    ? response
                    : ( error.title
                    ?? error.detail
                    ?? error.message
                    ?? error.exceptionMessage
                    ?? error
                    ?? "Json Server Error"), error);
            }
            throw new Error(await response.text());
        }
        if (contentType && !contentType.includes("/json")) {
            // throw new Error(`Unable to convert to json\r\n${contentType}\r\n${await response.text()}`);
            throw new Error(`Unable to convert to json\r\n${contentType}}`);
        }
        return this.resultConverter(await response.json());
    }

    protected interceptFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        throw new Error("not supported");
    }

    protected getJson<T>(options: IHttpRequest) {
        options.method = "GET";
        return this.fetchJson<T>(options);
    }

    protected postFormModel<T>(options: IHttpRequest) {
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

// @ts-expect-error
delete HttpSession.prototype.interceptFetch;
