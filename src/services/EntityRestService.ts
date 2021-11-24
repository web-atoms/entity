import { CancelToken } from "@web-atoms/core/dist/core/types";
import DISingleton from "@web-atoms/core/dist/di/DISingleton";
import { AjaxOptions } from "@web-atoms/core/dist/services/http/AjaxOptions";
import BaseUrl, { BaseService, Body,
    Cancel,
    Delete, Get, Path, Post, Put, Queries } from "@web-atoms/core/dist/services/http/RestService";
import IClrEntity, { IProperties } from "../models/IClrEntity";
import IEntityModel from "../models/IEntityModel";
import IPagedList from "../models/IPagedList";

export interface IQueryFilter {
    filter?: string;
    parameters?: any[];
    keys?: IProperties;
    orderBy?: string;
    start?: number;
    size?: number;
    include?: string[];
}

interface IBulkUpdateModel {
    keys: IClrEntity[];
    update: {
        [key: string]: any;
    };
    throwWhenNotFound?: boolean;
}

interface IBulkDeleteModel {
    keys: IClrEntity[];
    throwWhenNotFound?: boolean;
}

@DISingleton()
@BaseUrl("/api/entity/")
export default class EntityRestService extends BaseService {

    @Get("model")
    public model(): Promise<IEntityModel[]> {
        return null;
    }

    @Get("query/{entity}")
    public query(
        @Path("entity") entity: string,
        @Queries query: IQueryFilter,
        @Cancel ct: CancelToken
    ): Promise<IPagedList<IClrEntity>> {
        return null;
    }

    @Put("")
    public insert(@Body body: IClrEntity): Promise<IClrEntity> {
        return null;
    }

    @Post("")
    public save(@Body body: IClrEntity): Promise<IClrEntity> {
        return null;
    }

    @Delete("")
    public delete(@Body body: IClrEntity): Promise<void> {
        return null;
    }

    @Post("bulk")
    public bulkSave(@Body body: IBulkUpdateModel): Promise<IClrEntity> {
        return null;
    }

    @Delete("bulk")
    public bulkDelete(@Body body: IBulkDeleteModel): Promise<void> {
        return null;
    }
}
