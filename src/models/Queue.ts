const next = Symbol("nextInQueue");

export default class Queue<T> {

    head = null;

    peek() {
        return this.head;
    }

    public enqueue(item: T) {
        if (this.head) {
            this.head[next] = item;
        }
        this.head = item;
    }

    public dequeue() {
        if (!this.head) {
            return void 0;
        }
        const { head } = this;
        this.head = this.head[next];
        delete head[next];
        return head;
    }

}
