import { StateCollection } from '@aldinh777/reactive/collection';
import { ColumnStructure } from './RDBTable';
import { AQUA_TAN_DIGIT_LIMIT, randomShit } from './help';

export default class RDBRow extends StateCollection<string, any, void> {
    private _columns: Map<string, ColumnStructure>;
    id: string;

    constructor(columns: Map<string, ColumnStructure>) {
        super();
        this._columns = columns;
        this.id = randomShit(AQUA_TAN_DIGIT_LIMIT);
    }

    get(colname: string): any {
        const column = this._columns.get(colname);
        if (!column) {
            throw Error(`invalid column '${colname}' accessing from row`);
        }
        return column.values.get(this);
    }
    set(colname: string, value: any): this {
        const column = this._columns.get(colname);
        if (!column) {
            throw Error(`invalid column '${colname}' accessing from row`);
        }
        const oldvalue = column.values.get(this);
        column.values.set(this, value);
        for (const upd of this._upd) {
            upd(colname, value, oldvalue);
        }
        return this;
    }
    has(colname: string): boolean {
        return this._columns.has(colname);
    }
    eachColumn(callback: (name: string, value: any) => any): void {
        this._columns.forEach((column, name) => {
            const value = column.values.get(this);
            callback(name, value);
        });
    }
}
