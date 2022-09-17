import { State } from '@aldinh777/reactive';
import { StateMap } from '@aldinh777/reactive/collection';
import RDTable from './RDTable';
import RDViewBuilder, { RDView } from './RDViewBuilder';

export default class RDB {
    private _tables: StateMap<RDTable> = new StateMap();

    createTable(table: string, structure: object): RDTable {
        if (!this._tables.has(table)) {
            const tb = new RDTable(table, structure);
            this._tables.set(table, tb);
            return tb;
        } else {
            return this._tables.get(table) as RDTable;
        }
    }
    selectTable(table: string): RDTable {
        const tb = this._tables.get(table);
        if (tb) {
            return tb;
        } else {
            throw Error(`inable to select non existing table '${table}'`);
        }
    }
    createViewBuilder(): RDViewBuilder {
        return new RDViewBuilder(this);
    }
    static displayView(view: RDView): any {
        console.log(
            view.raw.map((o) => {
                const p: any = {};
                for (const k in o) {
                    const what = o[k];
                    if (what instanceof State) {
                        p[k] = what.getValue();
                    } else {
                        p[k] = what;
                    }
                }
                return p;
            })
        );
    }
}
