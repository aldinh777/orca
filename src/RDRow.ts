import { StateList, StateMap } from '@aldinh777/reactive/collection';

export default class RDRow extends StateMap<any> {
    private _ref: Map<string, RDRow> = new Map();
    private _refs: Map<string, StateList<RDRow>> = new Map();
    private _deref: Map<string, RDRow> = new Map();
    private _derefs: Map<string, StateList<RDRow>> = new Map();

    replaceRef() {}
    deleteRef() {}
    selectRef() {}

    addRefs() {}
    deleteRefs() {}
    selectRefs() {}

    selectDeref() {}
    selectDerefs() {}
}
