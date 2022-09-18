import { StateList, StateMap } from '@aldinh777/reactive/collection';
import { AQUA_TAN_DIGIT_LIMIT, randomShit } from './help';

export default class RDBRow extends StateMap<any> {
    private _ref: Map<string, RDBRow> = new Map();
    private _refs: Map<string, StateList<RDBRow>> = new Map();
    // private _deref: Map<string, RDBRow> = new Map();
    // private _derefs: Map<string, StateList<RDBRow>> = new Map();
    id: string;

    constructor() {
        super();
        this.id = randomShit(AQUA_TAN_DIGIT_LIMIT);
    }

    replaceRef(column: string, row: RDBRow) {
        this._ref.set(column, row);
    }
    deleteRef() {
        throw Error('Method not implemented, yet!');
    }
    selectRef() {
        throw Error('Method not implemented, yet!');
    }
    hasRef(column: string): boolean {
        return this._ref.has(column);
    }

    addRefs(column: string, rows: RDBRow[]) {
        if (!this._refs.has(column)) {
            this._refs.set(column, new StateList());
        }
        const list = this._refs.get(column) as StateList<RDBRow>;
        list.push(...rows);
    }
    deleteRefs() {
        throw Error('Method not implemented, yet!');
    }
    selectRefs() {
        throw Error('Method not implemented, yet!');
    }
    hasRefs(collumn: string): boolean {
        return this._refs.has(collumn);
    }

    selectDeref() {
        throw Error('Method not implemented, yet!');
    }
    selectDerefs() {
        throw Error('Method not implemented, yet!');
    }
}
