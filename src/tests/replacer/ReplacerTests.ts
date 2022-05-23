import Assert from "@web-atoms/unit-test/dist/Assert";
import Test from "@web-atoms/unit-test/dist/Test";
import TestItem from "@web-atoms/unit-test/dist/TestItem";
import CastAs from "../../CastAs";
import EF from "../../EF";
import { convertToLinq } from "../../services/Query";

const match = (expected, result) => {
    Assert.equals(expected, convertToLinq(result.toString()));
};

export default class ReplacerTests extends TestItem {

    @Test
    public replaceEFFunctions() {
        match(`(x) => CastAs.String(x.TagType) == "a"`,
            (x) =>
                CastAs.string(x.tagType) === "a");
        match(`(x) => CastAs.String(x.TagType) == "a" && EF.Functions.IsDate(x.Date)`,
            (x) =>
                CastAs.string(x.tagType) === "a"
                && EF.functions.isDate(x.date));
    }

    @Test
    public replaceSelect() {
        match(
            `(x) => ( new { name = x.FirstName, email = x.EmailAddress })`,
            (x) => ({ name: x.firstName, email: x.emailAddress }));
    }

    @Test
    public replaceSelectNested() {
        match(
            `(x) => ( new { name = x.FirstName, email = ( new { address = x.EmailAddress }) })`,
            (x) => ({ name: x.firstName, email: ({ address: x.emailAddress }) }));
    }

    @Test
    public replaceSelectNestedMinified() {
        match(
            `(x) => ( new { name = x.FirstName, email = new { address = x.EmailAddress } })`,
            (x) => ({ name: x.firstName, email: { address: x.emailAddress } }));
    }

    @Test
    public replaceMethods() {
        match(
            `(x) => x.Files.Any((f) => f.Name.StartsWith("image"))`,
            (x) => x.files.any((f) => f.name.startsWith("image")));
        match(
            `(x) => x.Files.Any((f) => f.Name.StartsWith("image"))`,
                (x) => x.files.some((f) => f.name.startsWith("image")));
        }
}
