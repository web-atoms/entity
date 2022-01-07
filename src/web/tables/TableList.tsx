import Bind from "@web-atoms/core/dist/core/Bind";
import XNode from "@web-atoms/core/dist/core/XNode";
import { AtomComboBox } from "@web-atoms/core/dist/web/controls/AtomComboBox";
import { AtomControl } from "@web-atoms/core/dist/web/controls/AtomControl";
import { AtomItemsControl } from "@web-atoms/core/dist/web/controls/AtomItemsControl";
import IClrEntity from "../../models/IClrEntity";
import Editor from "../edit/Editor";
import TableListViewModel from "./TableListViewModel";

const BindEntity = Bind.forData<IClrEntity>();

export default class TableList extends AtomControl {

    public viewModel: TableListViewModel;

    public create() {
        this.viewModel = this.resolve(TableListViewModel);

        this.render(<div>
            <AtomComboBox
                items={Bind.oneWay(() => this.viewModel.tables)}
                value={Bind.twoWays(() => this.viewModel.table)}/>
            <input
                placeholder={`Valid Lambda Expression e.g. x => x.Key === "a"`}
                type="search" value={Bind.twoWays(() => this.viewModel.search)}/>
            <button
                eventClick={Bind.event(() => this.viewModel.refreshSearch())}
                text="Search"/>
            <button
                eventClick={Bind.event(() => this.viewModel.add(Editor))}
                text="Add"/>
            <table>
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Values</th>
                        <th>Edit</th>
                        <th>Delete</th>
                    </tr>
                </thead>
                <AtomItemsControl
                    for="tbody"
                    items={Bind.oneWay(() => this.viewModel.list.items)}>
                    <AtomItemsControl.itemTemplate>
                        <tr>
                            <td text={BindEntity.oneWay((x) => x.data.$type)}></td>
                            <td text={BindEntity.oneWay((x) => JSON.stringify(x.data))}></td>
                            <td>
                                <button
                                    eventClick={BindEntity.event((e) => this.viewModel.edit(Editor, e.data))}
                                    text="Edit"
                                    />
                            </td>
                            <td>
                                <button
                                    eventClick={BindEntity.event((e) => this.viewModel.delete(e.data))}
                                    text="Delete"/>
                            </td>
                        </tr>
                    </AtomItemsControl.itemTemplate>
                </AtomItemsControl>
                <tfoot>
                    <tr>
                        <td colSpan="5">
                            <span text="Total: "/>
                            <span text={Bind.oneWay(() => this.viewModel.list.total)}/>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>);
    }

}
