import { State } from '@aldinh777/reactive';
import { StateMap } from '@aldinh777/reactive/collection';
import RDBTable from './RDBTable';
import RDBViewBuilder, { RDBView } from './RDBViewBuilder';

export default class RDB {
    private _tables: StateMap<RDBTable> = new StateMap();
    query: RDBViewBuilder = new RDBViewBuilder(this);

    createTable(table: string, structure: object): RDBTable {
        if (!this._tables.has(table)) {
            const tb = new RDBTable(this, table, structure);
            this._tables.set(table, tb);
            return tb;
        } else {
            throw Error(`attempting to create an already existing table '${table}'`);
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
    dropTable(table: string) {
        if (this._tables.has(table)) {
            const tb = this._tables.get(table) as RDBTable;
            tb.delete(() => true);
            this._tables.delete(table);
        } else {
            throw Error(`trying to delete non existing table ${table}`);
        }
    }
    renameTable(oldTable: string, newTable: string) {}
    static viewToObject(view: RDBView): any {
        return view.raw.map((o) => {
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
        });
    }
    static displayView(view: RDBView): any {
        console.log(RDB.viewToObject(view));
    }
}
