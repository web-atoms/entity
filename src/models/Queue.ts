export default class Queue<T> {

    public get size() {
        return this.length;
    }

    public get peek() {
        if(!this.length) {
            return void 0;
        }
        return this.store[this.start];
    }

    private store = new Array(4) as T[];

    private start = 0;
    private length = 0;

    private get nextIndex() {
        let index = this.start + this.length;
        if (index >= this.store.length) {
            index = (this.start + this.length) - this.store.length;
        }
        return index;
    }

    public enqueue(item: T) {
        if (this.length === this.store.length) {
            this.resize(this.store.length*2);
        }
        this.store[this.nextIndex] = item;
        this.length++;
    }

    public dequeue() {
        if(!this.length) {
            return void 0;
        }
        const item = this.store[this.start];
        this.start++;
        if (this.start === this.store.length) {
            this.start = 0;
        }
        this.length--;
        return item;
    }

    private resize(n: number) {
        if (!this.length) {
            // this will clear all existing items...
            this.store.length = 0;
            this.store.length = n;
            this.start = 0;
            return;
        }
        if (this.start > 0) {
            const old = this.store;
            this.store = new Array(n);
            const afterStart = Math.min(
                this.start + this.length,
                old.length - this.start
            );

            const afterStartItems = old.slice(
                this.start);

            // after start
            this.store.splice(0,0, ... afterStartItems);

            // before start
            this.store.splice(afterStart, 0,  ... old.slice(
                0,
                old.length - this.start
            ));
            this.start = 0;
            return;
        }
        this.store.length = n;
    }

}
