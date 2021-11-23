import Bind from "@web-atoms/core/dist/core/Bind";
import XNode from "@web-atoms/core/dist/core/XNode";
import { AtomControl } from "@web-atoms/core/dist/web/controls/AtomControl";
import { AtomItemsControl } from "@web-atoms/core/dist/web/controls/AtomItemsControl";
import { AtomWindow } from "@web-atoms/core/dist/web/controls/AtomWindow";
import EditorViewModel, { IPropertyValue } from "./EditorViewModel";

const BindProperty = Bind.forData<IPropertyValue>();

export default class Editor extends AtomWindow {

    public viewModel: EditorViewModel;

    public create() {
        this.viewModel = this.resolve(EditorViewModel);
        this.render(<AtomWindow>
            <AtomWindow.windowTemplate>
                <table>
                    <thead>
                        <tr>
                            <th colSpan={4}>
                                <span text={Bind.oneWay(() => this.viewModel.name )}/>
                            </th>
                        </tr>
                    </thead>
                    <AtomItemsControl for="tbody" items={Bind.oneWay(() => this.viewModel.keys)}>
                        <AtomItemsControl.itemTemplate>
                            <tr>
                                <td text={BindProperty.oneTime((x) => x.data.name)}/>
                                <td text=":"/>
                                <td>
                                    <input value={BindProperty.twoWays((x) => x.data.value)}/>
                                </td>
                                <td>
                                    <i
                                        class="fas fa-trash-alt"
                                        eventClick={BindProperty.event((s) =>
                                            this.viewModel.delete(s.data) )}/>
                                </td>
                            </tr>
                        </AtomItemsControl.itemTemplate>
                    </AtomItemsControl>
                    <AtomItemsControl for="tbody" items={Bind.oneWay(() => this.viewModel.value)}>
                        <AtomItemsControl.itemTemplate>
                            <tr>
                                <td text={BindProperty.oneTime((x) => x.data.name)}/>
                                <td text=":"/>
                                <td>
                                    <input value={BindProperty.twoWays((x) => x.data.value)}/>
                                </td>
                                <td>
                                    <i
                                        class="fas fa-trash-alt"
                                        eventClick={BindProperty.event((s) =>
                                            this.viewModel.delete(s.data) )}/>
                                </td>
                            </tr>
                        </AtomItemsControl.itemTemplate>
                    </AtomItemsControl>
                </table>
            </AtomWindow.windowTemplate>
            <AtomWindow.commandTemplate>
                <div>
                    <button
                        eventClick={Bind.event(() => this.viewModel.save())}
                        text="Save"/>
                    <button
                        eventClick={Bind.event(() => this.viewModel.cancel())}
                        text="Cancel"
                        />
                </div>
            </AtomWindow.commandTemplate>
        </AtomWindow>);
    }

}
