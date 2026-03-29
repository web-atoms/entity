import Assert from "@web-atoms/unit-test/dist/Assert.js";
import Test from "@web-atoms/unit-test/dist/Test.js";
import TestItem from "@web-atoms/unit-test/dist/TestItem.js";
import CastAs from "../../CastAs.js";
import EF from "../../EF.js";
import { convertToLinq, QueryComposer } from "../../services/Query.js";

const match = (expected, result) => {
    Assert.equals(expected, convertToLinq(result.toString()));
};

export default class ComposerTests extends TestItem {
    @Test
    public compose() {
        const q = new QueryComposer<{name: string}>();
        q.add({ a: "a" }, (a) => (y) => y.name.startsWith(a.a));
        q.add({ a: "b" }, (a) => (y) => y.name.startsWith(a.a));
        q.add({ a: "c" }, (a) => (y) => y.name.startsWith(a.a));
        const [p, t] = q.asQuery();
        console.log(p);
        console.log(t);
    }
}
