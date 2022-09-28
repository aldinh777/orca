import { StateCollection, StateList } from '@aldinh777/reactive/collection';
import RDBTable, { ColumnStructure } from './RDBTable';
import { AQUA_TAN_DIGIT_LIMIT, randomShit, removeInside } from './help';
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
        if (!verify(value)) {
            throw Error(
                `this shit is programmed to never happen and somehow ` +
                    `you make the impossible to happen what the f*ck? ` +
                    `i have zero idea how this is even possible, this is wicked. ` +
                    `congratulation anyway`
            );
        }
        const oldvalue = values.get(this);
        if (type === 'ref') {
            if (oldvalue instanceof State) {
                oldvalue.setValue(value);
            } else {
                throw Error(`invalid refference not a state? why not? how?`);
            }
        } else {
            values.set(this, value);
            this.trigger('set', colname, value, oldvalue);
        }
        return this;
    }
    has(colname: string): boolean {
        const { values } = this.getColumn(colname);
        return values.has(this);
    }
    addRefs(colname: string, ...rows: RDBRow[]): void {
        const { type, ref, values } = this.getColumn(colname);
        if (type !== 'refs' || !ref) {
            throw Error(`fail adding refferences, '${colname}' is not a references`);
        }
        if (!(ref instanceof State)) {
            throw Error(`unresolved refferences`);
        }
        const table = ref.getValue();
        if (!(table instanceof RDBTable)) {
            throw Error(`its just error wtf!`);
        }
        const refs = values.get(this) as StateList<RDBRow>;
        for (const row of rows) {
            if (!(row instanceof RDBRow)) {
                throw Error(`type mismatch when adding ref to '${colname}'. type: '${typeof row}'`);
            }
            if (!table.hasRow(row)) {
                throw Error(`table row mismatch when trying to add ref '${colname}'`);
            }
            if (!refs.raw.includes(row)) {
                refs.push(row);
            }
        }
    }
    deleteRefs(colname: string, filter: (row: RDBRow) => boolean): void {
        const { type, values } = this.getColumn(colname);
        if (type !== 'refs') {
            throw Error(`fail deleteing refferences, reason unclear`);
        }
        const refs = values.get(this) as StateList<RDBRow>;
        for (const ref of refs.raw) {
            if (filter(ref)) {
                removeInside(refs, ref);
            }
        }
    }
    hasRef(colname: string, row: RDBRow): boolean {
        const { type, values } = this.getColumn(colname);
        if (type === 'ref') {
            const ref = values.get(this) as State<RDBRow | null>;
            const refrow = ref.getValue();
            return refrow === row;
        } else if (type === 'refs') {
            const refs = values.get(this) as StateList<RDBRow>;
            return refs.raw.includes(row);
        } else {
            throw Error(`column '${colname}' is not a reference`);
        }
    }
    eachColumn(callback: (name: string, column: ColumnStructure) => void): void {
        this._columns.forEach((column, name) => {
            callback(name, column);
        });
    }
    getColumn(colname: string): ColumnStructure {
        const column = this._columns.get(colname);
        if (!column) {
            throw Error(`invalid column '${colname}' accessing from row`);
        }
        return column;
    }
}
