import { StateList, StateMap } from '@aldinh777/reactive/collection';
import { AQUA_TAN_DIGIT_LIMIT, randomShit } from './help';

export default class RDBRow extends StateMap<any> {
    private _ref: Map<string, RDBRow> = new Map();
    private _refs: Map<string, StateList<RDBRow>> = new Map();
    private _deref: Map<string, RDBRow> = new Map();
    private _derefs: Map<string, StateList<RDBRow>> = new Map();
    id: string;

    constructor() {
        super();
        this.id = randomShit(AQUA_TAN_DIGIT_LIMIT);
    }

    replaceRef() {}
    deleteRef() {}
    selectRef() {}

    addRefs() {}
    deleteRefs() {}
    selectRefs() {}

    selectDeref() {}
    selectDerefs() {}
}
