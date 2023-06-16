const changeSet = Symbol("changeSet");

const copyBasicProperties = (target, source) => {
    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            const element = source[key];
            switch(typeof element) {
                case "object":
                    if (element instanceof Date) {
                        target[key] = element;
                    }
                    break;
                case "symbol":
                case "function":
                    break;
                default:
                    target[key] = element;
                    break;
            }
        }
    }
};

/**
 * ChangeSet represents set of changes made
 * to entity graph.
 * 
 * This is important if we want to make changes and 
 * we want to undo changes as well as support
 * binding and updates.
 */
export default class ChangeSet<T extends object = any> implements ProxyHandler<any> {

    public modified: boolean = false;

    public static create<T extends object = any>(entity: T) {
        return new ChangeSet(entity);
    }

    public readonly editable: any;

    public readonly included: Set<any>;

    public readonly changes: any;

    constructor(
        public readonly entity: T,
        included: Iterable<any> = [entity],
        private readonly parent?: ChangeSet
    ){
        this.included = new Set(included);
        this.changes = Array.isArray(entity) ? [] : {};
        this.editable = new Proxy(this.changes, this);
        this.changes[changeSet] = this;
    }

    get(target: any, p: string | symbol, receiver: any) {

        if (typeof p === "symbol" && p === changeSet) {
            return this;
        }
        let cs = this.changes[p]?.[changeSet];
        if (cs) {
            return cs.editable;
        }
        const value = Reflect.get(this.entity, p) as any;
        cs = value?.[changeSet];
        if (cs) {
            return cs.editable;
        }
        if (value?.$type || Array.isArray(value)) {
            return this.createNewEntry(value, p).editable;
        }
        return value;
    }

    set(target: any, p: string | symbol, newValue: any, receiver: any): boolean {

        if (newValue[changeSet]) {
            // this should only be set while committing an object..not before that...
            return;
        }


        if (newValue?.$type || Array.isArray(newValue)) {
            // we need to create a change link...
            // if not included....
            this.setModified();
            
            this.createNewEntry(newValue, p);
            return true;
        }
        if (!this.modified) {
            this.setModified();
        }
        this.changes[p] = newValue;
        return true;
    }

    private createNewEntry(value: any, p?) {
        if (this.included.has(value)) {
            // something is seriously wrong...
            throw new Error("Invalid operation");
        }
        this.included.add(value);

        // create new change set...
        const cs = new ChangeSet(value, this.included, this);

        if (Array.isArray(value)) {

            // accessing array means it may be modified...
            // we will not set it as modified.. but we will add items to the array
            for (let index = 0; index < value.length; index++) {
                const element = value[index];
                const ep = this.createNewEntry(element);
                cs.changes[index] = ep.changes;
            }

            this.changes[p] = cs.changes;

        } else if (p !== void 0) {
            this.changes[p] = cs.changes;
        }

        return cs;
    }

    private setModified() {
        if (!this.modified) {
            if (!Array.isArray(this.entity)) {
                copyBasicProperties(this.changes, this.entity);
            }
            this.modified = true;
        }
        this.parent?.setModified();
    }

}
