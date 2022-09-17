import { StateList, StateMap } from '@aldinh777/reactive/collection';
import { AQUA_TAN_DIGIT_LIMIT, randomShit } from './help';

export default class RDRow extends StateMap<any> {
    private _ref: Map<string, RDRow> = new Map();
    private _refs: Map<string, StateList<RDRow>> = new Map();
    private _deref: Map<string, RDRow> = new Map();
    private _derefs: Map<string, StateList<RDRow>> = new Map();
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
