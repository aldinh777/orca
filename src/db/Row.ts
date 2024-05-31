import { AQUA_TAN_DIGIT_LIMIT, randomShit } from '../help';
import Model from './Model';

export default class Row {
    private _model: Model;
    id: string;

    constructor(model: Model, id: string = randomShit(AQUA_TAN_DIGIT_LIMIT)) {
        this._model = model;
        this.id = id;
    }

    get(columnName: string): any {
        return this._model.getColumn(columnName).getValue(this);
    }
    set(columnName: string, value: any): this {
        this._model.getColumn(columnName).setValue(this, value);
        return this;
    }
    addRefs(columnName: string, ...rows: Row[]): void {
        /** TODO */
    }
    delRefs(columnName: string, filter: (row: Row) => boolean): void {
        /** TODO */
    }
    hasRef(columnName: string, row: Row): boolean {
        return false;
        /** TODO */
    }
}
