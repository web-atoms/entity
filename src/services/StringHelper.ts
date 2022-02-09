export default class StringHelper {

    public static findParameter(f: any): string {
        let text: string = f.toString();
        let i = text.indexOf("=>");
        if (i !== -1) {
            return text.substring(0, i);
        }
        i = text.indexOf("(");
        text = text.substring(i + 1);
        i = text.indexOf(")");
        return text.substring(0, i);
    }

    public static contains(left: string, right: string): boolean {
        if (!left) {
            return !right;
        }
        return left.toLowerCase().includes(right.toLowerCase());
    }
}
