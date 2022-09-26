import { State } from '@aldinh777/reactive';
import { StateList } from '@aldinh777/reactive/collection';
import RDB from './RDB';
import RDBRow from './RDBRow';

interface RDBViewRow {
    [key: string]: State<any>;
}
export type RDBView = StateList<RDBViewRow>;

export default class RDBViewBuilder {
    private _db: RDB;
    private _table?: string;
    private _props: string[] = [];
    private _filter?: (row: RDBRow) => boolean;
    private _sorters?: [field: string, order: 'asc' | 'desc'];

    constructor(db: RDB) {
        this._db = db;
    }

    private clone(): RDBViewBuilder {
        const builder = new RDBViewBuilder(this._db);
        builder._table = this._table;
        builder._props = [...this._props];
        builder._filter = this._filter;
        return builder;
    }
    from(table: string): RDBViewBuilder {
        const builder = this.clone();
        builder._table = table;
        return builder;
    }
    select(...columns: string[]): RDBViewBuilder {
        const builder = this.clone();
        builder._props = columns;
        return builder;
    }
    where(filter: (row: RDBRow) => boolean): RDBViewBuilder {
        const builder = this.clone();
        builder._filter = filter;
        return builder;
    }
    orderBy(column: string, order: 'asc' | 'desc' = 'asc'): RDBViewBuilder {
        const builder = this.clone();
        builder._sorters = [column, order];
        return builder;
    }
    buildView(): RDBView {
        if (!this._table) {
            throw Error(`pls specify table to select from`);
        }
        const table = this._db.selectTable(this._table);
        const view: StateList<RDBViewRow> = new StateList();
        const objMapper = new WeakMap();
        table.selectRows('*', (row) => {
            this.watchRowUpdate(objMapper, row, view);
        });
        table.onInsert((_, inserted) => {
            this.watchRowUpdate(objMapper, inserted, view);
        });
        table.onDelete((_, deleted) => {
            if (objMapper.has(deleted)) {
                this.removeItemFromView(objMapper, deleted, view);
            }
        });
        return view;
    }

    private watchRowUpdate(objMapper: WeakMap<RDBRow, any>, row: RDBRow, view: RDBView) {
        if (this._filter ? this._filter(row) : true) {
            this.insertItemToView(objMapper, row, view);
        }
        row.onUpdate((key) => {
            if (objMapper.has(row)) {
                if (this._filter ? !this._filter(row) : false) {
                    this.removeItemFromView(objMapper, row, view);
                } else if (this._sorters && this._sorters[0] === key) {
                    this.removeItemFromView(objMapper, row, view);
                    this.insertItemToView(objMapper, row, view);
                }
            } else {
                if (this._filter && this._filter(row)) {
                    this.insertItemToView(objMapper, row, view);
                }
            }
        });
    }
    private insertItemToView(objMapper: WeakMap<RDBRow, RDBViewRow>, row: RDBRow, view: RDBView) {
        const cloneData = objMapper.get(row) || this.copySelected(objMapper, row);
        if (this._sorters) {
            const [prop, asc] = this._sorters;
            let flagDone = false;
            for (let i = 0; i < view.raw.length; i++) {
                const item = view.get(i) as any;
                const cloneValue = cloneData[prop].getValue();
                const itemValue = item[prop].getValue();
                const compare = asc === 'asc' ? cloneValue < itemValue : cloneValue > itemValue;
                if (compare) {
                    view.splice(i, 0, cloneData);
                    flagDone = true;
                    break;
                }
            }
            if (!flagDone) {
                view.push(cloneData);
            }
        } else {
            view.push(cloneData);
        }
    }
    private removeItemFromView(objMapper: WeakMap<RDBRow, any>, row: RDBRow, view: RDBView) {
        const otwdelete = objMapper.get(row);
        const indexdelete = view.raw.indexOf(otwdelete);
        objMapper.delete(row);
        view.splice(indexdelete, 1);
    }
    private copySelected(objMapper: WeakMap<RDBRow, RDBViewRow>, row: RDBRow): RDBViewRow {
        const cloneData: any = {};
        if (this._props.length === 0) {
            this.selectAll(row, cloneData);
        } else {
            for (const prop of this._props) {
                if (prop === '*') {
                    this.selectAll(row, cloneData);
                } else if (prop === 'id') {
                    cloneData.id = row.id;
                } else {
                    if (!row.has(prop)) {
                        throw Error(
                            `not valid column '${prop}' to select from table '${this._table}'`
                        );
                    }
                    cloneData[prop] = new State(row.get(prop));
                }
            }
        }
        row.onUpdate((key, value) => {
            if (Reflect.has(cloneData, key)) {
                cloneData[key].setValue(value);
            }
        });
        objMapper.set(row, cloneData);
        return cloneData;
    }
    private selectAll(row: RDBRow, ob: any) {
        ob.id = row.id;
        row.eachColumn((key, value) => {
            const st = new State(value);
            ob[key] = st;
        });
    }
}
