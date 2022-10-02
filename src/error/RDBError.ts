const ERROR_CODES: any = {
    TABLE_EXISTS: (name: string) => `attempting to recreate an already existing table '${name}'.`,
    TABLE_NOT_EXISTS: (name: string) => `inable to select non existing table '${name}'.`,
    TABLE_DROP_NOT_EXISTS: (name: string) =>
        `trying to delete non existing table '${name}'. ` +
        `how cruel, it doesn't exists yet you still want to remove it from existence.`,
    TABLE_RENAME_NOT_EXISTS: (oldname: string, newname: string) =>
        `renaming '${oldname}' but no table with name '${oldname}' ` +
        `so '${oldname}' not renamed to '${newname}' because table with name '${oldname}' ` +
        `not exists in the first place.`,
    TABLE_CLONE_JUTSU: (oldname: string, newname: string) =>
        `renaming '${oldname}' to '${newname}' but table '${newname}' ` +
        `already exists, you can't do that or else you have 2 tables with the same name.` +
        `remove table '${newname}' first or consider a new name. What about '${newname}2'?.`,
    COLUMN_DROP_NOT_EXISTS: (name: string, table: string) =>
        `column to delete '${name}' never cease to exists anywhere on table ${table}`,
    COLUMN_NOT_EXISTS: (name: string) =>
        `success is nothing but lies. column '${name}' not modified, apparently ` +
        `this database is blind and cannot find any column with that name. ` +
        `we sincerenly apologize for our lack of competence :(`,
    COLUMN_IN_DANGER: () =>
        `so sorry, but this table have data inside. we afraid changing any column type ` +
        `could summon chaos, thus we are strictly told not to allow column to be modify ` +
        `when data is exists. very sorry for this.`,
    COLUMN_RENAME_NOT_EXISTS: (oldname: string, table: string) =>
        `rename column failed: column to rename not exists\n` +
        `table: '${table}'\n` +
        `column to rename: '${oldname}'`,
    COLUMN_RENAME_TARGET_EXISTS: (oldname: string, newname: string, table: string) =>
        `failed rename column: targetname already exists\n` +
        `table: '${table}'\n` +
        `oldname: '${oldname}', newname: '${newname}'`,
    INSERT_INVALID_COLUMN: (colname: string, table: string, o: any) =>
        `imvalid column '${colname}' when insert into table '${table}'\n` +
        `=== the object in question ===\n${JSON.stringify(o, null, 2)}`,
    INSERT_INVALID_REF: (colname: string) => `invalid type ref colum '${colname}' must object`,
    INSERT_INVALID_REFS: (colname: string) =>
        `invalud type refs sorri fot colum '${colname}' must array`,
    WHAT_IS_HAPPENING: (type: string) =>
        `this is not supposed to be happen! invalid column type '${type}'`,
    TABLE_REF_INVALIDATED: (table: string) => `somehow table refference lost at table '${table}'`,
    TABLE_REF_UNRESOLVED: (table: string, wait: string) =>
        `table refference not yet resolved. still waiting for table '${wait}' to be created. \n` +
        `waiter: '${table}'`,
    TYPE_MISMATCH: (type: string, value: any) =>
        `unmatching type when setting value. \nexpected: '${type}', reality: '${typeof value}'`,
    REF_FAILED: () => `failed getting refference`,
    REF_INVALID_TYPE: () => `invalid refference type. allowed: RDBRow | null`,
    REF_ROW_DELETED: () => `row as reference probably deleted from it's table`,
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
    NOT_A_REFERENCE: (colname: string) => `column '${colname}' is not a reference`,
    REFS_ADD_FAILED: (colname: string) =>
        `fail adding refferences, '${colname}' is not a references`,
    REFS_ADD_TYPE_MISMATCH: (colname: string, row: any) =>
        `type mismatch when adding ref to '${colname}'. type: '${typeof row}'`,
    REFS_ADD_TABLE_MISMATCH: (colname: string) =>
        `table row mismatch when trying to add ref '${colname}'`,
    REFS_DELETE_FAILED: () => `fail deleteing refferences, reason unclear`,
    REFS_UNRESOLVED: () => `unresolved refferences`,
    INVALID_COLUMN: (colname: string) => `invalid column '${colname}' accessing from row`,
    'HOW???': () => `its just error wtf!`,
    TABLE_NOT_SPECIFIED: () => `pls specify table to select from`,
    NOT_VALID_COLUMN: (prop: string) => `not valid column '${prop}'`,
    REF_IS_NOT_A_REF: (colname: string) => `selected refs is not a ref '${colname}'`,
    ALLAH_IS_WATCHING: () => `only god knows`
};

export default class RDBError extends Error {
    code: string;

    constructor(code: string, ...rest: any[]) {
        super(`[${code}]\n${ERROR_CODES[code](...rest)}`);
        this.name = 'RDBError';
        this.code = code;
    }
}
