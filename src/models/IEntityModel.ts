export interface IEntityKey {
    name: string;
    type: string;
}

export interface IEntityPropertyInfo extends IEntityKey {
    isNullable?: boolean;
}

export interface IEntityNavigationProperty extends IEntityKey {
    isCollection?: boolean;
}

export default interface IEntityModel {
    name?: string;
    keys?: IEntityKey[];
    properties?: IEntityPropertyInfo[];
    navigationProperties?: IEntityNavigationProperty[];
}

export class EntityContext {
    public models: IEntityModel[];
    private cache: any;
    constructor(models: IEntityModel[]) {
        this.models = models;
        this.cache = [];
        for (const iterator of models) {
            this.cache[iterator.name] = iterator;
        }
    }

    public for(name: string): IEntityModel {
        return this.cache[name];
    }
}
