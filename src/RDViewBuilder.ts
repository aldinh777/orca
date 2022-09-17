import { State } from '@aldinh777/reactive';
import { StateList } from '@aldinh777/reactive/collection';
import RDB from './RDB';
import RDRow from './RDRow';

interface RDViewRow {
    [key: string]: State<any>;
}
export type RDView = StateList<RDViewRow>;

export default class RDViewBuilder {
    private _db: RDB;
    private _table?: string;
    private _props: string[];
    private _filter?: (row: RDRow) => boolean;
    private _sorters: [field: string, order: 'asc' | 'desc'][];
    private _group?: string;

    constructor(db: RDB) {
        this._db = db;
        this._props = [];
        this._sorters = [];
    }

    private clone(): RDViewBuilder {
        const builder = new RDViewBuilder(this._db);
        builder._table = this._table;
        builder._props = [...this._props];
        builder._filter = this._filter;
        return builder;
    }
    from(table: string): RDViewBuilder {
        const builder = this.clone();
        builder._table = table;
        return builder;
    }
    select(...columns: string[]): RDViewBuilder {
        const builder = this.clone();
        builder._props = columns;
        return builder;
    }
    where(filter: (item: any) => boolean): RDViewBuilder {
        const builder = this.clone();
        builder._filter = filter;
        return builder;
    }
    orderBy(column: string, order: 'asc' | 'desc' = 'asc'): RDViewBuilder {
        const builder = this.clone();
        builder._sorters.push([column, order]);
        return builder;
    }
    groupBy(column: string): RDViewBuilder {
        const builder = this.clone();
        builder._group = column;
        return builder;
    }
    buildView(): RDView {
        if (!this._table) {
            throw Error(`pls specify table to select from`);
        }
        const table = this._db.selectTable(this._table);
        const view: StateList<RDViewRow> = new StateList();
        const objMapper = new WeakMap();
        table.selectRows('*', (row) => {
            RDViewBuilder.watchRowUpdate(objMapper, row, view, this);
        });
        table.onInsert((_, inserted) => {
            RDViewBuilder.watchRowUpdate(objMapper, inserted, view, this);
        });
        table.onDelete((_, deleted) => {
            if (objMapper.has(deleted)) {
                RDViewBuilder.removeItemFromView(objMapper, deleted, view);
            }
        });
        return view;
    }
    private static watchRowUpdate(
        objMapper: WeakMap<RDRow, any>,
        row: RDRow,
        view: RDView,
        builder: RDViewBuilder
    ) {
        const { _filter } = builder;
        if (_filter ? _filter(row) : true) {
            RDViewBuilder.insertItemToView(objMapper, row, view, builder);
        }
        row.onUpdate(() => {
            if (objMapper.has(row)) {
                if (_filter ? !_filter(row) : false) {
                    RDViewBuilder.removeItemFromView(objMapper, row, view);
                }
            } else {
                if (_filter ? _filter(row) : true) {
                    RDViewBuilder.insertItemToView(objMapper, row, view, builder);
                }
            }
        });
    }
    private static insertItemToView(
        objMapper: WeakMap<RDRow, any>,
        row: RDRow,
        view: RDView,
        builder: RDViewBuilder
    ) {
        const { _props } = builder;
        const cloneData = RDViewBuilder.copySelected(row, _props, builder);
        objMapper.set(row, cloneData);
        view.push(cloneData);
    }
    private static removeItemFromView(objMapper: WeakMap<RDRow, any>, row: RDRow, view: RDView) {
        const otwdelete = objMapper.get(row);
        const indexdelete = view.raw.indexOf(otwdelete);
        objMapper.delete(row);
        view.splice(indexdelete, 1);
    }
    private static copySelected(row: RDRow, props: string[], builder: RDViewBuilder): any {
        const cloneData: any = {};
        if (props.length === 0) {
            RDViewBuilder.selectAll(row, cloneData);
        } else {
            for (const prop of props) {
                if (prop === '*') {
                    RDViewBuilder.selectAll(row, cloneData);
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
    private static selectAll(row: RDRow, ob: any) {
        row.raw.forEach((value, key) => {
            const st = new State(value);
            ob[key] = st;
        });
    }
}
