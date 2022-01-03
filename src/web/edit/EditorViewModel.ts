import { Inject } from "@web-atoms/core/dist/di/Inject";
import Action from "@web-atoms/core/dist/view-model/Action";
import { AtomWindowViewModel } from "@web-atoms/core/dist/view-model/AtomWindowViewModel";
import Load from "@web-atoms/core/dist/view-model/Load";
import IClrEntity from "../../models/IClrEntity";
import EntityService from "../../services/BaseEntityService";

export interface IPropertyValue {
    readonly: boolean;
    required: boolean;
    name: string;
    value: any;
}

export default class EditorViewModel extends AtomWindowViewModel {

    public model: IClrEntity;

    public insert: boolean;

    public name: string = "";
    public keys: IPropertyValue[] = [];
    public value: IPropertyValue[] = [];

    @Inject
    private entityService: EntityService;

    @Load({ init: true })
    public async loadAsync() {
        const model = this.model;
        const entityContext = await this.entityService.model();
        const entityModel = entityContext.for(model.$type);
        this.name = this.insert
            ? `Add ${model.$type}`
            : `Modify ${model.$type}`;
        const keys = this.keys;
        keys.clear();
        for (const e of entityModel.keys) {
            if (!this.insert && !Object.prototype.hasOwnProperty.call(model, e.name)) {
                continue;
            }
            const value = model[e.name];
            keys.push({
                name: e.name,
                value,
                required: true,
                readonly: !this.insert
            });
        }
        const values = this.value;
        values.clear();
        for (const e of entityModel.properties) {
            if (!this.insert && !Object.prototype.hasOwnProperty.call(model, e.name)) {
                continue;
            }
            const value = model[e.name];
            values.push({
                name: e.name,
                value,
                required: !e.isNullable,
                readonly: false
            });
        }
    }

    @Action()
    public async save() {
        let model = {
            $type: this.model.$type
        };
        for (const iterator of this.keys) {
            model[iterator.name] = iterator.value;
        }
        for (const iterator of this.value) {
            model[iterator.name] = iterator.value;
        }
        if (this.insert) {
            model = await this.entityService.insert(model);
        } else {
            model = await this.entityService.save(model);
        }
        this.close(model);
    }

    public delete(a) {
        this.value.remove(a);
        this.keys.remove(a);
    }
}
