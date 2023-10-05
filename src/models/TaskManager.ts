import Queue from "./Queue";

export default class TaskManager {

    public rateLimit = 10;

    private running: Set<any> = new Set();

    private waiting: Queue<{ resolve, reject, fx }> = new Queue();

    protected run<TR>(fx: (... a: any[]) => Promise<TR>): Promise<TR> {

        const pr = new Promise((resolve, reject) => {
            this.waiting.enqueue({ resolve, reject, fx });
        });

        this.processQueue();

        return pr as Promise<TR>;
    }

    protected processQueue() {
        for(;;) {
            if (this.running.size >= this.rateLimit) {
                return;
            }

            if (!this.waiting.size) {
                return;
            }

            const t = this.waiting.dequeue();
            if (!t) {
                return;
            }

            const { fx, resolve, reject } = t;

            this.running.add(fx);

            fx().then(
                (r) => {
                    this.running.delete(fx);
                    setTimeout(this.processQueue, 1, this);
                    resolve(r);
                },
                (e) => {
                    this.running.delete(fx);
                    setTimeout(this.processQueue, 1, this);
                    reject(e);
                }
            );

        }
    }

}