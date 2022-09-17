import { State } from '@aldinh777/reactive';
import { StateMap } from '@aldinh777/reactive/collection';
import RDBTable from './RDBTable';
import RDBViewBuilder, { RDBView } from './RDBViewBuilder';

export default class RDB {
    private _tables: StateMap<RDBTable> = new StateMap();

    createTable(table: string, structure: object): RDBTable {
        if (!this._tables.has(table)) {
            const tb = new RDBTable(this, table, structure);
            this._tables.set(table, tb);
            return tb;
        } else {
            return this._tables.get(table) as RDBTable;
        }
    }
    selectTable(table: string): RDBTable {
        const tb = this._tables.get(table);
        if (tb) {
            return tb;
        } else {
            throw Error(`inable to select non existing table '${table}'`);
        }
    }
    createViewBuilder(): RDBViewBuilder {
        return new RDBViewBuilder(this);
    }
    static displayView(view: RDBView): any {
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
