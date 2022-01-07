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
import EntityService, { IMethodsFilter } from "../../services/BaseEntityService";

export default class TableListViewModel extends AtomViewModel {

    public version = 0;

    public list: IPagedList<IClrEntity>;

    public table: string;

    public tables: any[] = [];

    public filter = {
        start: 0,
        size: 100,
        filter: null,
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
        const { start, size } = this.filter;
        const filter = this.search;
        let q = this.entityService.query({ name: this.table});
        if (filter) {
            q = q.where({}, () => filter as any);
        }
        this.list = await q
            .toPagedList({ start, size});
    }

    public refreshSearch() {
        this.filter.filter = this.search;
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
