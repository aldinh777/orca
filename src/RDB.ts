import { State } from '@aldinh777/reactive';
import { StateList } from '@aldinh777/reactive/collection';
import RDBTable from './RDBTable';
import { RDBViewRow } from './RDBView';
import RDBViewBuilder from './RDBViewBuilder';
import RDBError from '../error/RDBError';

export default class RDB {
    private _tables: Map<string, RDBTable> = new Map();
    private _tablenames: WeakMap<RDBTable, string> = new WeakMap();
    private _refwaiters: Map<string, State<RDBTable | string>[]> = new Map();
    query: RDBViewBuilder = new RDBViewBuilder(this);

    createTable(name: string, structure: object): RDBTable {
        if (this._tables.has(name)) {
            throw new RDBError('TABLE_EXISTS', name);
        }
        const table = new RDBTable(this, structure);
        this._tables.set(name, table);
        this._tablenames.set(table, name);
        if (this._refwaiters.has(name)) {
            const waitlist = this._refwaiters.get(name);
            waitlist?.forEach((tableState) => {
                tableState.setValue(table);
            });
            this._refwaiters.delete(name);
        }
        return table;
    }
    selectTable(name: string): RDBTable {
        const table = this._tables.get(name);
        if (!table) {
            throw new RDBError('TABLE_NOT_EXISTS', name);
        }
        return table;
    }
    dropTable(name: string): void {
        if (!this._tables.has(name)) {
            throw new RDBError('TABLE_DROP_NOT_EXISTS', name);
        }
        const tb = this._tables.get(name) as RDBTable;
        RDBTable.drop(tb);
        this._tablenames.delete(tb);
        this._tables.delete(name);
    }
    renameTable(oldname: string, newname: string): void {
        if (!this._tables.has(oldname)) {
            throw new RDBError('TABLE_RENAME_NOT_EXISTS', oldname, newname);
        }
        if (this._tables.has(newname)) {
            throw new RDBError('TABLE_CLONE_JUTSU', oldname, newname);
        }
        const tb = this._tables.get(oldname) as RDBTable;
        this._tables.delete(oldname);
        this._tables.set(newname, tb);
        this._tablenames.set(tb, newname);
    }
    getTableName(table: RDBTable): string | undefined {
        return this._tablenames.get(table);
    }
    getTableRefference(name: string): State<RDBTable | string> {
        const table = this._tables.get(name);
        const tableState = new State(name as RDBTable | string);
        if (table) {
            tableState.setValue(table);
        } else {
            if (!this._refwaiters.has(name)) {
                this._refwaiters.set(name, []);
            }
            const waitlist = this._refwaiters.get(name);
            waitlist?.push(tableState);
        }
        return tableState;
    }
    static freezeView(view: StateList<RDBViewRow>): any {
        return view.raw.map(RDB.unbox);
    }
    private static unbox(o: any): any {
        if (o === null) {
            return null;
        }
        const p: any = {};
        for (const k in o) {
            const what = o[k];
            if (what instanceof State) {
                const whatvalue = what.getValue();
                if (typeof whatvalue === 'object') {
                    p[k] = RDB.unbox(whatvalue);
                } else {
                    p[k] = whatvalue;
                }
            } else if (what instanceof StateList) {
                p[k] = RDB.freezeView(what);
            } else {
                p[k] = what;
            }
        }
        return p;
    }
}
