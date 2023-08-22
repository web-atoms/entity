export interface IProperties {
    [key: string]: string | number | null | undefined;
}

export interface INavigationProperties {
    [key: string]: {
        add?: IClrEntity[],
        remove?: IClrEntity[],
        clear?: boolean,
        set?: IClrEntity
    };
}

export default interface IClrEntity {
    $type: string;
    $deleted?: boolean;
    $navigations?: INavigationProperties;
}

export type IClrEntityLike<T> = Omit<T, "$type">;

export interface IClrExtendedEntity {
    [key: string]: any;
}