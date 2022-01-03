import { CancelToken } from "@web-atoms/core/dist/core/types";
import DISingleton from "@web-atoms/core/dist/di/DISingleton";
import { Inject } from "@web-atoms/core/dist/di/Inject";
import BaseUrl, { BaseService, Get, Path, Queries } from "@web-atoms/core/dist/services/http/RestService";
import { NavigationService } from "@web-atoms/core/dist/services/NavigationService";
import ReferenceService from "@web-atoms/core/dist/services/ReferenceService";
import Action from "@web-atoms/core/dist/view-model/Action";
import { AtomViewModel, Watch } from "@web-atoms/core/dist/view-model/AtomViewModel";
import Load from "@web-atoms/core/dist/view-model/Load";
import IClrEntity from "../../models/IClrEntity";
import IPagedList from "../../models/IPagedList";
import EntityService from "../../services/BaseEntityService";
import { IQueryFilter } from "../../services/EntityRestService";

export default class TableListViewModel extends AtomViewModel {

    public version = 0;

    public list: IPagedList<IClrEntity>;

    public table: string;

    public tables: any[] = [];

    public filter: IQueryFilter = {
        start: 0,
        size: 100,
        filter: null,
        orderBy: null,
        parameters: null
    };

    public parameters: any;

    public search: any;

    @Inject
    private entityService: EntityService;

    @Inject
    private navigationService: NavigationService;

    @Inject
    private referenceService: ReferenceService;

    @Load({ init: true })
    public async load() {
        this.tables = (await this.entityService.model()).models.map((x) => ({
            label: x.name,
            value: x.name
        }));
        this.table = this.tables[0].value;
    }

    @Load( { watch: true , watchDelayMS: 300 })
    public async loadTable(ct?: CancelToken) {
        const filter = {
            start: this.filter.start,
            size: this.filter.size,
            methods: JSON.stringify( [{
                where: [this.filter.filter, ... this.filter.parameters],
            }]),
            _v: this.version
        };
        this.list = await this.entityService.restApi.query(this.table, filter, ct);
    }

    public refreshSearch() {
        this.filter.filter = this.search;
        this.filter.parameters = this.parameters.split(",");
        this.version++;
    }

    @Action({ confirm: "Are you sure you want to delete this?" })
    public async delete(e: IClrEntity) {
        await this.entityService.delete(e);
        await this.loadTable();
    }

    public async edit(page, e: IClrEntity) {
        await this.navigationService.openPage(page, {
            name: this.table,
            insert: false,
            model: e
        });
        await this.loadTable();
    }

    public async add(page: any) {
        await this.navigationService.openPage(page, {
            name: this.table,
            insert: true,
            model: {
                $type: this.table
            }
        });
        await this.loadTable();
    }
}
