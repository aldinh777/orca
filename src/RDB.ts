import { State } from '@aldinh777/reactive';
import RDBTable from './RDBTable';
import RDBViewBuilder, { RDBView } from './RDBViewBuilder';

export default class RDB {
    private _tables: Map<string, RDBTable> = new Map();
    private _tablenames: WeakMap<RDBTable, string> = new WeakMap();
    query: RDBViewBuilder = new RDBViewBuilder(this);

    createTable(name: string, structure: object): RDBTable {
        if (!this._tables.has(name)) {
            const tb = new RDBTable(this, structure);
            this._tables.set(name, tb);
            this._tablenames.set(tb, name);
            return tb;
        } else {
            throw Error(`attempting to recreate an already existing table '${name}'.`);
        }
    }
    selectTable(name: string): RDBTable {
        const tb = this._tables.get(name);
        if (tb) {
            return tb;
        } else {
            throw Error(`inable to select non existing table '${name}'.`);
        }
    }
    dropTable(name: string) {
        if (this._tables.has(name)) {
            const tb = this._tables.get(name) as RDBTable;
            this._tablenames.delete(tb);
            tb.delete(() => true);
            this._tables.delete(name);
        } else {
            throw Error(
                `trying to delete non existing table '${name}'. ` +
                    `how cruel, it doesn't exists yet you still want to remove it from existence.`
            );
        }
    }
    renameTable(oldname: string, newname: string) {
        if (this._tables.has(oldname)) {
            if (this._tables.has(newname)) {
                throw Error(
                    `renaming '${oldname}' to '${newname}' but table '${newname}' ` +
                        `already exists, you can't do that or else you have 2 tables with the same name.` +
                        `remove table '${newname}' first or consider a new name. What about '${newname}2'?.`
                );
            }
            const tb = this._tables.get(oldname) as RDBTable;
            this._tables.delete(oldname);
            this._tables.set(newname, tb);
            this._tablenames.set(tb, newname);
        } else {
            throw Error(
                `renaming '${oldname}' but no table with name '${oldname}' ` +
                    `so '${oldname}' not renamed to '${newname}' because table with name '${oldname}' ` +
                    `not exists in the first place.`
            );
        }
    }
    getTableName(table: RDBTable): string | undefined {
        return this._tablenames.get(table);
    }
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
