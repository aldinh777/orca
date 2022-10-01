import { State } from '@aldinh777/reactive';
import { StateList } from '@aldinh777/reactive/collection';
import { Subscription } from '@aldinh777/reactive/util';
import RDBError from '../error/RDBError';
import { leach, removeDeeper, tableEach } from '../help';
import RDB from '../db/RDB';
import RDBRow from '../db/RDBRow';
import RDBTable from '../db/RDBTable';

export interface RDBViewRow {
    id?: string;
    [key: string]: State<any> | StateList<RDBViewRow> | string | undefined;
}
export type ViewQuery = string | [string, ...ViewQuery[]];
type BOITTO = void;

export default class RDBView extends StateList<RDBViewRow> {
    private _db: RDB;
    private _props: ViewQuery[];
    private _filter?: (row: RDBRow) => boolean;
    private _sorters?: [field: string, order: 'asc' | 'desc'];
    private _objMapper: WeakMap<RDBRow, RDBViewRow> = new WeakMap();
    private _contents: WeakSet<RDBRow> = new WeakSet();
    private _subs: Subscription<any, any>[] = [];

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
        this._subs.push(
            tableEach(
                table,
                (eachrow) => this.watchRowUpdate(eachrow),
                (delrow) => {
                    if (this._contents.has(delrow)) {
                        this.removeItem(delrow);
                    }
                }
            )
        );
    }

    stop() {
        RDBView.BANISHMENT_THIS_WORLD(this);
    }
    private static BANISHMENT_THIS_WORLD(WORLD: RDBView): BOITTO {
        for (const DESTRUCTION of WORLD._subs) {
            RDBView.EXPLOSION(DESTRUCTION);
        }
        WORLD._subs = [];
    }
    private static EXPLOSION(YOUTUBER_YOU_DISLIKE: Subscription<any, any>): BOITTO {
        YOUTUBER_YOU_DISLIKE.unsub();
    }

    private watchRowUpdate(row: RDBRow): void {
        if (this._filter ? this._filter(row) : true) {
            this.insertItem(row);
        }
        this._subs.push(
            row.onUpdate((key) => {
                if (this._contents.has(row)) {
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
            })
        );
    }
    private insertItem(row: RDBRow): void {
        const cloneData = this.copySelected(row, this._props, this._objMapper);
        this._contents.add(row);
        if (this._sorters) {
            const [prop, asc] = this._sorters;
            let flagDone = false;
            for (let i = 0; i < this.raw.length; i++) {
                const item = this.get(i);
                if (item) {
                    const cloneState = cloneData[prop];
                    const itemState = item[prop];
                    if (cloneState instanceof State && itemState instanceof State) {
                        const cloneValue = cloneState.getValue();
                        const itemValue = itemState.getValue();
                        const compare =
                            asc === 'asc' ? cloneValue < itemValue : cloneValue > itemValue;
                        if (compare) {
                            this.splice(i, 0, cloneData);
                            flagDone = true;
                            break;
                        }
                    }
                }
            }
            if (!flagDone) {
                this.push(cloneData);
            }
        } else {
            this.push(cloneData);
        }
    }
    private removeItem(row: RDBRow): void {
        removeDeeper(this, row, this._objMapper);
        this._contents.delete(row);
    }
    private copySelected(
        row: RDBRow,
        props: ViewQuery[],
        mapper: WeakMap<RDBRow, RDBViewRow>
    ): RDBViewRow {
        const item = mapper.get(row);
        if (item) {
            return item;
        }
        const cloneData: RDBViewRow = {};
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
                            throw new RDBError('NOT_VALID_COLUMN', prop);
                        }
                        cloneData[prop] = new State(row.get(prop));
                    }
                } else {
                    const [refquery, ...refprops] = prop;
                    const [colname, deref] = refquery.split('#').reverse();
                    if (deref) {
                        cloneData[refquery] = this.selectPainPeko(colname, deref, refprops, row);
                    } else if (refquery === '*') {
                        this.selectAllRefs(refprops, row, cloneData);
                    } else {
                        cloneData[refquery] = this.selectRef(refquery, refprops, row);
                    }
                }
            }
        }
        this._subs.push(
            row.onUpdate((key, value) => {
                if (Reflect.has(cloneData, key)) {
                    const propState = cloneData[key];
                    if (propState instanceof State) {
                        propState.setValue(value);
                    }
                }
            })
        );
        mapper.set(row, cloneData);
        return cloneData;
    }
    private selectAllProps(row: RDBRow, ob: RDBViewRow): void {
        ob.id = row.id;
        row.eachColumn((key, { type, values }) => {
            if (type !== 'ref' && type !== 'refs') {
                ob[key] = new State(values.get(row));
            }
        });
    }
    private selectAllRefs(props: ViewQuery[], row: RDBRow, ob: RDBViewRow): void {
        row.eachColumn((key, { type }) => {
            if (type === 'ref' || type === 'refs') {
                ob[key] = this.selectRef(key, props, row);
            }
        });
    }

    private selectRef(
        column: string,
        props: ViewQuery[],
        row: RDBRow
    ): StateList<RDBViewRow> | State<RDBViewRow | null> {
        const pie = row.get(column);
        const mapper: WeakMap<RDBRow, RDBViewRow> = new WeakMap();
        if (pie instanceof State) {
            const cloneRefState = new State(null as RDBViewRow | null);
            const refObserver = (ref: RDBRow | null) =>
                cloneRefState.setValue(ref === null ? null : this.copySelected(ref, props, mapper));
            refObserver(pie.getValue());
            this._subs.push(pie.onChange(refObserver));
            return cloneRefState;
        } else if (pie instanceof StateList) {
            const cloneRefsList: StateList<RDBViewRow> = new StateList();
            const executeOrder66 = (ref: RDBRow) =>
                cloneRefsList.push(this.copySelected(ref, props, mapper));
            this._subs.push(
                leach(pie, executeOrder66, (ref) => removeDeeper(cloneRefsList, ref, mapper))
            );
            return cloneRefsList;
        } else {
            throw new RDBError('ALLAH_IS_WATCHING');
        }
    }
    private selectPainPeko(
        colname: string,
        deref: string,
        refprops: ViewQuery[],
        row: RDBRow
    ): StateList<RDBViewRow> {
        const derefMapper: WeakMap<RDBRow, RDBViewRow> = new WeakMap();
        const derefTable = this._db.selectTable(deref);
        const derefs: StateList<RDBViewRow> = new StateList();
        const executeOrder66 = (ref: RDBRow) =>
            derefs.push(this.copySelected(ref, refprops, derefMapper));
        const watchRowRefsUpdate = (ref: RDBRow) => {
            const rubrub = ref.get(colname);
            if (rubrub instanceof State) {
                if (rubrub.getValue() === row) {
                    executeOrder66(ref);
                }
                this._subs.push(
                    rubrub.onChange((val) => {
                        if (val === row) {
                            executeOrder66(ref);
                        } else {
                            removeDeeper(derefs, ref, derefMapper);
                        }
                    })
                );
            } else if (rubrub instanceof StateList) {
                if (rubrub.raw.includes(row)) {
                    executeOrder66(ref);
                }
                this._subs.push(
                    rubrub.onInsert((_, inserted) => {
                        if (inserted === row) {
                            executeOrder66(ref);
                        }
                    })
                );
                this._subs.push(
                    rubrub.onDelete((_, deleted) => {
                        if (deleted === row) {
                            removeDeeper(derefs, ref, derefMapper);
                        }
                    })
                );
            } else {
                throw new RDBError('REF_IS_NOT_A_REF', colname);
            }
        };
        this._subs.push(
            tableEach(derefTable, watchRowRefsUpdate, (ref) =>
                removeDeeper(derefs, ref, derefMapper)
            )
        );
        return derefs;
    }
}
