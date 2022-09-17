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
    private _props: string[];
    private _filter?: (row: RDBRow) => boolean;
    private _sorters: [field: string, order: 'asc' | 'desc'][];
    private _group?: string;

    constructor(db: RDB) {
        this._db = db;
        this._props = [];
        this._sorters = [];
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
    where(filter: (item: any) => boolean): RDBViewBuilder {
        const builder = this.clone();
        builder._filter = filter;
        return builder;
    }
    orderBy(column: string, order: 'asc' | 'desc' = 'asc'): RDBViewBuilder {
        const builder = this.clone();
        builder._sorters.push([column, order]);
        return builder;
    }
    groupBy(column: string): RDBViewBuilder {
        const builder = this.clone();
        builder._group = column;
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
            RDBViewBuilder.watchRowUpdate(objMapper, row, view, this);
        });
        table.onInsert((_, inserted) => {
            RDBViewBuilder.watchRowUpdate(objMapper, inserted, view, this);
        });
        table.onDelete((_, deleted) => {
            if (objMapper.has(deleted)) {
                RDBViewBuilder.removeItemFromView(objMapper, deleted, view);
            }
        });
        return view;
    }
    private static watchRowUpdate(
        objMapper: WeakMap<RDBRow, any>,
        row: RDBRow,
        view: RDBView,
        builder: RDBViewBuilder
    ) {
        const { _filter } = builder;
        if (_filter ? _filter(row) : true) {
            RDBViewBuilder.insertItemToView(objMapper, row, view, builder);
        }
        row.onUpdate(() => {
            if (objMapper.has(row)) {
                if (_filter ? !_filter(row) : false) {
                    RDBViewBuilder.removeItemFromView(objMapper, row, view);
                }
            } else {
                if (_filter ? _filter(row) : true) {
                    RDBViewBuilder.insertItemToView(objMapper, row, view, builder);
                }
            }
        });
    }
    private static insertItemToView(
        objMapper: WeakMap<RDBRow, any>,
        row: RDBRow,
        view: RDBView,
        builder: RDBViewBuilder
    ) {
        const { _props } = builder;
        const cloneData = RDBViewBuilder.copySelected(row, _props, builder);
        objMapper.set(row, cloneData);
        view.push(cloneData);
    }
    private static removeItemFromView(objMapper: WeakMap<RDBRow, any>, row: RDBRow, view: RDBView) {
        const otwdelete = objMapper.get(row);
        const indexdelete = view.raw.indexOf(otwdelete);
        objMapper.delete(row);
        view.splice(indexdelete, 1);
    }
    private static copySelected(row: RDBRow, props: string[], builder: RDBViewBuilder): any {
        const cloneData: any = {};
        if (props.length === 0) {
            RDBViewBuilder.selectAll(row, cloneData);
        } else {
            for (const prop of props) {
                if (prop === '*') {
                    RDBViewBuilder.selectAll(row, cloneData);
                } else if (prop === 'id') {
                    cloneData.id = row.id;
                } else {
                    if (!row.has(prop)) {
                        throw Error(
                            `not valid column '${prop}' to select from table '${builder._table}'`
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
        return cloneData;
    }
    private static selectAll(row: RDBRow, ob: any) {
        ob.id = row.id;
        row.raw.forEach((value, key) => {
            const st = new State(value);
            ob[key] = st;
        });
    }
}
