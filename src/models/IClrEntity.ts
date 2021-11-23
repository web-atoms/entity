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
    [key: string]: any;
}
