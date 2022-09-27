import { State } from '@aldinh777/reactive';
import { StateList } from '@aldinh777/reactive/collection';
import RDB from './RDB';
import RDBRow from './RDBRow';
import RDBTable from './RDBTable';

export interface RDBViewRow {
    [key: string]: State<any>;
}
export type ViewQuery = string | [string, ...ViewQuery[]];

export default class RDBView extends StateList<any> {
    private _db: RDB;
    private _props: ViewQuery[];
    private _filter?: (row: RDBRow) => boolean;
    private _sorters?: [field: string, order: 'asc' | 'desc'];
    private _objMapper = new WeakMap();

    constructor(
        db: RDB,
        table: RDBTable,
        props: ViewQuery[],
        filter?: (row: RDBRow) => boolean,
        sorters?: [string, 'asc' | 'desc']
    ) {
        super();
        this._db = db;
        this._props = props;
        this._filter = filter;
        this._sorters = sorters;
        table.selectRows('*', (row) => {
            this.watchRowUpdate(row);
        });
        table.onInsert((_, inserted) => {
            this.watchRowUpdate(inserted);
        });
        table.onDelete((_, deleted) => {
            if (this._objMapper.has(deleted)) {
                this.removeItem(deleted);
            }
        });
    }

    private watchRowUpdate(row: RDBRow) {
        if (this._filter ? this._filter(row) : true) {
            this.insertItem(row);
        }
        row.onUpdate((key) => {
            if (this._objMapper.has(row)) {
                if (this._filter ? !this._filter(row) : false) {
                    this.removeItem(row);
                } else if (this._sorters && this._sorters[0] === key) {
                    this.removeItem(row);
                    this.insertItem(row);
                }
            } else {
                if (this._filter && this._filter(row)) {
                    this.insertItem(row);
                }
            }
        });
    }
    private insertItem(row: RDBRow) {
        const cloneData = this._objMapper.get(row) || this.copySelected(row, this._props);
        if (this._sorters) {
            const [prop, asc] = this._sorters;
            let flagDone = false;
            for (let i = 0; i < this.raw.length; i++) {
                const item = this.get(i) as any;
                const cloneValue = cloneData[prop].getValue();
                const itemValue = item[prop].getValue();
                const compare = asc === 'asc' ? cloneValue < itemValue : cloneValue > itemValue;
                if (compare) {
                    this.splice(i, 0, cloneData);
                    flagDone = true;
                    break;
                }
            }
            if (!flagDone) {
                this.push(cloneData);
            }
        } else {
            this.push(cloneData);
        }
    }
    private removeItem(row: RDBRow) {
        const otwdelete = this._objMapper.get(row);
        const indexdelete = this.raw.indexOf(otwdelete);
        this._objMapper.delete(row);
        this.splice(indexdelete, 1);
    }
    private copySelected(row: RDBRow, props: ViewQuery[], save: boolean = true): RDBViewRow {
        const cloneData: any = {};
        if (props.length === 0) {
            this.selectAllProps(row, cloneData);
        } else {
            for (const prop of props) {
                if (typeof prop === 'string') {
                    if (prop === '*') {
                        this.selectAllProps(row, cloneData);
                    } else if (prop === 'id') {
                        cloneData.id = row.id;
                    } else {
                        if (!row.has(prop)) {
                            throw Error(`not valid column '${prop}'`);
                        }
                        cloneData[prop] = new State(row.get(prop));
                    }
                } else {
                    const [refquery, ...refprops] = prop;
                    const [colname, deref] = refquery.split('#').reverse();
                    if (deref) {
                        const table = this._db.selectTable(deref);
                        cloneData[refquery] = new RDBView(this._db, table, refprops, (refrow) =>
                            refrow.hasRef(colname, row)
                        );
                    } else {
                        if (refquery === '*') {
                            this.selectAllRefs(refprops, row, cloneData);
                        } else {
                            this.selectRef(refquery, refprops, row, cloneData);
                        }
                    }
                }
            }
        }
        row.onUpdate((key, value) => {
            if (Reflect.has(cloneData, key)) {
                cloneData[key].setValue(value);
            }
        });
        if (save) {
            this._objMapper.set(row, cloneData);
        }
        return cloneData;
    }
    private selectAllProps(row: RDBRow, ob: any) {
        ob.id = row.id;
        row.eachColumn((key, { type, values }) => {
            if (type !== 'ref' && type !== 'refs') {
                const st = new State(values.get(row));
                ob[key] = st;
            }
        });
    }
    private selectAllRefs(props: ViewQuery[], row: RDBRow, ob: any) {
        row.eachColumn((key, { type }) => {
            if (type === 'ref' || type === 'refs') {
                this.selectRef(key, props, row, ob);
            }
        });
    }
    private selectRef(column: string, props: ViewQuery[], row: RDBRow, ob: any) {
        const { type, ref, values } = row.getColumn(column);
        const table = ref?.getValue();
        if (table instanceof RDBTable) {
            if (type === 'ref') {
                const refState = values.get(row) as State<RDBRow | null>;
                const cloneRefState: State<any> = new State(null);
                const refObserver = (ref: RDBRow | null) => {
                    if (ref === null) {
                        cloneRefState.setValue(null);
                    } else {
                        const cloneRef = this.copySelected(ref, props, false);
                        cloneRefState.setValue(cloneRef);
                    }
                };
                refObserver(refState.getValue());
                refState.onChange(refObserver);
                ob[column] = cloneRefState;
            } else if (type === 'refs') {
                const refsState = values.get(row) as StateList<RDBRow>;
                ob[column] = new RDBView(this._db, table, props, (row) =>
                    refsState.raw.includes(row)
                );
            }
        }
    }
}
