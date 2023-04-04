export default class CacheMap<TKey, T> {

    private cache = new Map<TKey, { access: number, value: T}>();

    private timer;

    constructor(private clearInterval = 15000) {

    }

    public getOrCreate(key: TKey, factory: (k: TKey) => T) {
        const now = Date.now();
        let r = this.cache.get(key);
        if (r === void 0) {
            r = { access: now, value: factory(key)};
            this.cache.set(key, r);
        }
        r.access = now;
        if (!this.timer) {
            this.timer = setTimeout(this.clear, this.clearInterval, this);
        }
        return r.value;
    }

    private clear() {
        const max = Date.now() - this.clearInterval;
        const toDelete = [];
        for (const [key, value] of this.cache.entries()) {
            if (value.access > max) {
                continue;
            }
            toDelete.push(key);
        }
        for (const iterator of toDelete) {
            this.cache.delete(iterator);
        }
        if (this.cache.size == 0) {
            this.timer = false;
        } else {
            this.timer = setTimeout(this.clear, this.clearInterval, this);
        }
    }

}
