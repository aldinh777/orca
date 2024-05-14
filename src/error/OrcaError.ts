export const ERROR_CODES: any = {
    MODEL_EXISTS: (name: string) => `attempting to recreate an already existing model '${name}'.`,
    MODEL_NOT_EXISTS: (name: string) => `inable to select non existing model '${name}'.`,
    MODEL_DROP_NOT_EXISTS: (name: string) =>
        `trying to delete non existing model '${name}'. ` +
        `how cruel, it doesn't exists yet you still want to remove it from existence :(`,
    MODEL_RENAME_NOT_EXISTS: (oldName: string, newName: string) =>
        `renaming '${oldName}' but no model with name '${oldName}' ` +
        `so '${oldName}' not renamed to '${newName}' because model with name '${oldName}' ` +
        `not exists in the first place.`,
    MODEL_CLONE_JUTSU: (oldName: string, newName: string) =>
        `renaming '${oldName}' to '${newName}' but model '${newName}' ` +
        `already exists, you can't do that or else you have 2 models with the same name, that's illegal! ` +
        `remove model '${newName}' first or consider a new name. What about '${newName}2'?.`,
    COLUMN_DROP_NOT_EXISTS: (name: string, model: string) =>
        `column to delete '${name}' never cease to exists anywhere on model ${model}`,
    COLUMN_NOT_EXISTS: (name: string) =>
        `success is nothing but lies. column '${name}' not modified, apparently ` +
        `this database is blind and cannot find any column with that name. ` +
        `we sincerenly apologize for our lack of competence :(`,
    COLUMN_IN_DANGER: () =>
        `so sorry, but this model have data inside. we afraid changing any column type ` +
        `could summon chaos, thus we are strictly told not to allow column to be modify ` +
        `when data is exists. very sorry for this.`,
    COLUMN_RENAME_NOT_EXISTS: (oldName: string, model: string) =>
        `rename column failed: column to rename not exists\n` +
        `model: '${model}'\n` +
        `column to rename: '${oldName}'`,
    COLUMN_RENAME_TARGET_EXISTS: (oldName: string, newName: string, model: string) =>
        `failed rename column: targetname already exists\n` +
        `model: '${model}'\n` +
        `oldName: '${oldName}', newName: '${newName}'`,
    INSERT_INVALID_COLUMN: (columnName: string, model: string, o: any) =>
        `imvalid column '${columnName}' when insert into model '${model}'\n` +
        `=== the object in question ===\n${JSON.stringify(o, null, 2)}`,
    INSERT_INVALID_REF: (columnName: string) => `invalid type ref colum '${columnName}' must object`,
    INSERT_INVALID_REFS: (columnName: string) => `invalud type refs sorri fot colum '${columnName}' must array`,
    WHAT_IS_HAPPENING: (type: string) => `this is not supposed to be happen! invalid column type '${type}'`,
    MODEL_REF_INVALIDATED: (model: string) => `somehow model refference lost at model '${model}'`,
    MODEL_REF_UNRESOLVED: (model: string, wait: string) =>
        `model refference not yet resolved. still waiting for model '${wait}' to be created. \n` + `waiter: '${model}'`,
    TYPE_MISMATCH: (type: string, value: any) =>
        `unmatching type when setting value. \nexpected: '${type}', reality: '${typeof value}'`,
    REF_FAILED: () => `failed getting refference`,
    REF_INVALID_TYPE: () => `invalid refference type. allowed: RDBRow | null`,
    REF_ROW_DELETED: () => `row as reference probably deleted from it's model`,
    ILLEGAL_REFS_SET: () =>
        `setting references through method '[row].set()' is not allowed.` +
        `use '[row].addRefs()' or '[row].deleteRefs()' instead to modify refferences`,
    INVALID_TYPE: (type: string) => `nonvalid type '${type}' when creating column`,
    IMPOSSIBLE: () =>
        `this shit is programmed to never happen and somehow ` +
        `you make the impossible to happen what the f*ck? ` +
        `i have zero idea how this is even possible, this is wicked. ` +
        `congratulation anyway`,
    NOT_A_STATE: () => `invalid refference not a state? why not? how?`,
    NOT_A_REFERENCE: (columnName: string) => `column '${columnName}' is not a reference`,
    REFS_ADD_FAILED: (columnName: string) => `fail adding refferences, '${columnName}' is not a references`,
    REFS_ADD_TYPE_MISMATCH: (columnName: string, row: any) =>
        `type mismatch when adding ref to '${columnName}'. type: '${typeof row}'`,
    REFS_ADD_MODEL_MISMATCH: (columnName: string) => `model row mismatch when trying to add ref '${columnName}'`,
    REFS_DELETE_FAILED: () => `fail deleteing refferences, reason unclear`,
    REFS_UNRESOLVED: () => `unresolved refferences`,
    INVALID_COLUMN: (columnName: string) => `invalid column '${columnName}' accessing from row`,
    'HOW???': () => `its just error wtf!`,
    MODEL_NOT_SPECIFIED: () => `pls specify model to select from`,
    NOT_VALID_COLUMN: (prop: string) => `not valid column '${prop}'`,
    REF_IS_NOT_A_REF: (columnName: string) => `selected refs is not a ref '${columnName}'`,
    ALLAH_IS_WATCHING: () => `only god knows`
};

export default class OrcaError extends Error {
    code: string;

    constructor(code: string, ...rest: any[]) {
        super(`[${code}]\n${ERROR_CODES[code](...rest)}`);
        this.name = 'RDBError';
        this.code = code;
    }
}
