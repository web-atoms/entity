import BaseEntityService, { IModel, Model } from "../../services/BaseEntityService";
import HttpSession from "../../services/HttpSession";
import { QueryProcessor } from "../../services/QueryProcessor";

interface IItem {
    $type: string, name: string, desc: string
}

const m1: IModel<IItem> = new Model<IItem>(
    "n1",
    ["name"],
    void 0,
    {
        keys: [  { name:"name" }],
        name: "n1",
        properties: [ { name: "desc"}],
        relations: [],
        methods: {
            run: "run"
        }
    }
);

class EnttiyService extends BaseEntityService {

    public queryProcessor: QueryProcessor;

}

const es = new EnttiyService();

es.query(m1, "run");