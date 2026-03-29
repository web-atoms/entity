import Test from "@web-atoms/unit-test/dist/Test.js";
import TestItem from "@web-atoms/unit-test/dist/TestItem.js";
import TaskManager from "../../models/TaskManager.js";
import Assert from "@web-atoms/unit-test/dist/Assert.js";

const sleep = (n) => new Promise((r) => setTimeout(r, n));

export class TestTaskManager extends TaskManager {

    public sleep(fx: () => any) {
        return this.queueRun(async () => {
            fx();
            await sleep(100);    
        })
    }
}

export default class TaskManagerTests extends TestItem {

    @Test
    public async test() {

        let n = 1;

        const tm = new TestTaskManager();
        tm.rateLimit = 2;

        const tasks = [];

        for (let index = 0; index < 20; index++) {
            tasks.push(tm.sleep(() => {
                n++;
                console.log([index, n]);
            }));
        }

        await sleep(50);

        Assert.equals(3, n);

        await sleep(150);

        Assert.equals(5, n);

        await Promise.all(tasks);

        Assert.equals(21, n);
    }
}