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
    $navigations?: INavigationProperties;
    /** @deprecated The field may not exist in the model */
    /** @warn The field may not exist in the model */
    [key: string]: any;
}
