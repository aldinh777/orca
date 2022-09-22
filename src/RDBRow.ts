import { StateCollection, StateList } from '@aldinh777/reactive/collection';
import RDBTable, { ColumnStructure } from './RDBTable';
import { AQUA_TAN_DIGIT_LIMIT, randomShit } from './help';
import { State } from '@aldinh777/reactive';

export default class RDBRow extends StateCollection<string, any, void> {
    private _columns: Map<string, ColumnStructure>;
    id: string;

    constructor(columns: Map<string, ColumnStructure>) {
        super();
        this._columns = columns;
        this.id = randomShit(AQUA_TAN_DIGIT_LIMIT);
    }

    get(colname: string): any {
        const { values } = this.getColumn(colname);
        return values.get(this);
    }
    set(colname: string, value: any): this {
        const { values, type, verify } = this.getColumn(colname);
        verify(value);
        const oldvalue = values.get(this);
        if (type === 'ref') {
            if (oldvalue instanceof State) {
                oldvalue.setValue(value);
            } else {
                throw Error(`invalid refference not a state? why not? how?`);
            }
        } else {
            values.set(this, value);
        }
        for (const upd of this._upd) {
            upd(colname, value, oldvalue);
        }
        return this;
    }
    has(colname: string): boolean {
        const { values } = this.getColumn(colname);
        return values.has(this);
    }
    addRefs(colname: string, ...rows: RDBRow[]) {
        const { type, ref, values } = this.getColumn(colname);
        if (type === 'refs' && ref) {
            const table = ref.getValue();
            if (table instanceof RDBTable) {
                const refs = values.get(this) as StateList<RDBRow>;
                for (const row of rows) {
                    if (table.hasRow(row)) {
                        refs.push(row);
                    } else {
                        throw Error(`table row mismatch mf!`);
                    }
                }
            } else {
                throw Error(`its just error wtf!`);
            }
        } else {
            throw Error(`fail adding refferences, reason unclear`);
        }
    }
    deleteRefs(colname: string, filter: (row: RDBRow) => boolean) {
        const { type, values } = this.getColumn(colname);
        if (type === 'refs') {
            const refs = values.get(this) as StateList<RDBRow>;
            const rawlist = refs.raw;
            const dellist = rawlist.filter(filter);
            for (const ref of dellist) {
                const index = rawlist.indexOf(ref);
                refs.splice(index, 1);
            }
        } else {
            throw Error(`fail deleteing refferences, reason unclear`);
        }
    }
    eachColumn(callback: (name: string, value: any) => any): void {
        this._columns.forEach((column, name) => {
            const value = column.values.get(this);
            callback(name, value);
        });
    }

    private getColumn(colname: string): ColumnStructure {
        const column = this._columns.get(colname);
        if (column) {
            return column;
        } else {
            throw Error(`invalid column '${colname}' accessing from row`);
        }
    }
}
