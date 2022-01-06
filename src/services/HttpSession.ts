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

export default class HttpSession {

    protected resultConverter = (e) => e;

    protected async fetchJson<T>(url: StringOrURIWithSearchParams, options?: RequestInit): Promise<T> {
        if (options?.body) {
            const body = options.body;
            if (body instanceof TextBody) {
                options.body = body.toString();
            } else {
                options.body = JSON.stringify(options.body);
            }
        }
        url = typeof url === "string" ? url : combine(url);
        const response = await fetch(url, options);
        const contentType = response.headers.get("Content-Type")?.toString() as string;
        if (contentType && !contentType.includes("/json")) {
            // throw new Error(`Unable to convert to json\r\n${contentType}\r\n${await response.text()}`);
            throw new Error(`Unable to convert to json\r\n${contentType}}`);
        }
        return this.resultConverter(await response.json());
    }

    protected async getJson<T>(url: StringOrURIWithSearchParams, headers?) {
        return (await this.fetchJson<T>(url, {
            method: "GET",
            headers: {
                ... headers
            }
        }));
    }

    protected async postForm<T>(url: StringOrURIWithSearchParams, data, headers?: any) {
        return (await this.fetchJson<T>(url, {
            method: "POST",
            body: (new TextBody(`formModel=${encodeURIComponent(JSON.stringify(data))}`)) as any,
            headers: {
                ... headers,
                "content-type":  "application/x-www-form-urlencoded"
            }
        }));
    }

    protected async postJson<T>(url: StringOrURIWithSearchParams, data, headers?: any) {
        return (await this.fetchJson<T>(url, {
            method: "POST",
            body: data,
            headers: {
                ... headers,
                "content-type":  "application/json"
            }
        }));
    }

    protected async deleteJson<T>(url: StringOrURIWithSearchParams, data, headers?: any) {
        return (await this.fetchJson<T>(url, {
            method: "DELETE",
            body: data,
            headers: {
                ... headers,
                "content-type":  "application/json"
            }
        }));
    }

    protected async putJson<T>(url: StringOrURIWithSearchParams, data, headers?: any) {
        return (await this.fetchJson<T>(url, {
            method: "PUT",
            body: data,
            headers: {
                ... headers,
                "content-type":  "application/json"
            }
        }));
    }
}
