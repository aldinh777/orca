import { State } from '@aldinh777/reactive';
import { StateList } from '@aldinh777/reactive/collection';
import RDBRow from './RDBRow';
import RDBTable from './RDBTable';

export interface RDBViewRow {
    [key: string]: State<any>;
}
export type ViewQuery = string | ((row: RDBRow) => boolean) | ViewQuery[];

export default class RDBView extends StateList<any> {
    private _props: ViewQuery[];
    private _filter?: (row: RDBRow) => boolean;
    private _sorters?: [field: string, order: 'asc' | 'desc'];
    private _objMapper = new WeakMap();

    constructor(
        table: RDBTable,
        props: ViewQuery[],
        filter?: (row: RDBRow) => boolean,
        sorters?: [string, 'asc' | 'desc']
    ) {
        super();
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
        const cloneData = this._objMapper.get(row) || this.copySelected(row);
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
    private copySelected(row: RDBRow): RDBViewRow {
        const cloneData: any = {};
        if (this._props.length === 0) {
            this.selectAll(row, cloneData);
        } else {
            for (const prop of this._props) {
                if (typeof prop === 'string') {
                    if (prop === '*') {
                        this.selectAll(row, cloneData);
                    } else if (prop === 'id') {
                        cloneData.id = row.id;
                    } else {
                        if (!row.has(prop)) {
                            throw Error(`not valid column '${prop}'`);
                        }
                        cloneData[prop] = new State(row.get(prop));
                    }
                } else if (typeof prop === 'function') {
                    // here goes filter for subview
                } else {
                    // here goes queries for subview
                }
            }
        }
        row.onUpdate((key, value) => {
            if (Reflect.has(cloneData, key)) {
                cloneData[key].setValue(value);
            }
        });
        this._objMapper.set(row, cloneData);
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
