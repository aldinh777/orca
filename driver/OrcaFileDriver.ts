import { join } from 'path';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync, renameSync, readdirSync } from 'fs';
import { isRefference, isRefferences } from '../src/help';
import OrcaModel, { type ColumnStructure } from '../src/db/OrcaModel';
import OrcaCache from '../src/db/OrcaCache';
import OrcaRow from '../src/db/OrcaRow';

/**
 *  _rdb_[db]
 *      structures
 *          [model].json        > structure
 *      values
 *          [model]
 *              [column]
 *                  [row id]    > value
 */
export default class OrcaFileDriver {
    path: string;
    db: OrcaCache;

    constructor(name: string = 'default', path: string = process.cwd()) {
        const dbPath = join(path, `_rdb_${name}`);
        const db = new OrcaCache();
        this.path = dbPath;
        this.db = db;

        if (existsSync(dbPath)) {
            const models = readdirSync(join(dbPath, 'structures'));
            for (const modelJson of models) {
                const structureText = readFileSync(join(dbPath, 'structures', modelJson));
                const structure = JSON.parse(structureText.toString('utf8'));
                const [modelName] = modelJson.split('.json');
                const model = db.createModel(modelName, structure);
                const rawValues: Map<string, any> = new Map();
                model.eachColumn(OrcaFileDriver.setRowNatives(model, dbPath, rawValues));
                const ravvValuesButArray = Array.from(rawValues.values());
                model.insertAll(ravvValuesButArray);
            }
            for (const modelJson of models) {
                const [modelName] = modelJson.split('.json');
                const model = db.selectModel(modelName);
                model.eachColumn(OrcaFileDriver.setRowRefs(model, dbPath));
            }
        } else {
            mkdirSync(join(dbPath, 'structures'), { recursive: true });
            mkdirSync(join(dbPath, 'values'), { recursive: true });
        }

        db.eachModel((_, model) => OrcaFileDriver.observeModel(model, this.path));
        db.onModelCreate((_, model) => OrcaFileDriver.observeModel(model, this.path));
        db.onModelDrop((name) => {
            rmSync(join(dbPath, 'structures', `${name}.json`));
            rmSync(join(dbPath, 'values', name), { recursive: true });
        });
        db.onModelRename((oldName: string, newName: string) => {
            const oldVaDir = join(dbPath, 'values', oldName);
            const newVaDir = join(dbPath, 'values', newName);
            const oldPath = join(dbPath, 'structures', `${oldName}.json`);
            const newPath = join(dbPath, 'structures', `${newName}.json`);
            renameSync(oldVaDir, newVaDir);
            renameSync(oldPath, newPath);
        });
    }

    ensureModel(modelName: string, schema: object) {
        if (!this.db.hasModel(modelName)) {
            this.db.createModel(modelName, schema);
        }
    }

    private static setRowNatives(model: OrcaModel, dbPath: string, rawValues: Map<string, any>) {
        return (columnName: string, { type }: ColumnStructure) => {
            const modelName = model.getName();
            if (!modelName) {
                throw Error('Invalid model Name');
            }
            const ids = readdirSync(join(dbPath, 'values', modelName, columnName));
            for (const id of ids) {
                const valueText = readFileSync(join(dbPath, 'values', modelName, columnName, id));
                const valve = rawValues.get(id) || {};
                if (!valve.id) {
                    valve.id = id;
                    rawValues.set(id, valve);
                }
                if (type === 'string') {
                    valve[columnName] = valueText.toString();
                } else if (type === 'number') {
                    const valueNumber = parseFloat(valueText.toString());
                    valve[columnName] = valueNumber;
                } else if (type === 'boolean') {
                    valve[columnName] = valueText.toString() === 'true';
                }
            }
        };
    }
    private static setRowRefs(model: OrcaModel, dbpath: string) {
        return (columnName: string, { type, ref }: ColumnStructure) => {
            const modelName = model.getName();
            if (!modelName) {
                throw Error('Invalid Model Name');
            }
            const ids = readdirSync(join(dbpath, 'values', modelName, columnName));
            for (const id of ids) {
                const valueText = readFileSync(join(dbpath, 'values', modelName, columnName, id));
                if (!ref) {
                    return;
                }
                const refModel = ref();
                if (typeof refModel === 'string') {
                    return;
                }
                if (type === 'ref') {
                    const row = model.get(id);
                    const ref = refModel.get(valueText.toString());
                    if (ref) {
                        row?.set(columnName, ref);
                    }
                } else if (type === 'refs') {
                    const rowids = valueText.toString().split('\n');
                    const refs = rowids.map((id) => refModel.get(id)).filter((r) => r !== undefined) as OrcaRow[];
                    const row = model.get(id);
                    row?.addRefs(columnName, ...refs);
                }
            }
        };
    }
    private static observeModel(model: OrcaModel, dbpath: string) {
        // do some suspicious thing to the model
        const modelName = model.getName();
        if (!modelName) {
            throw Error(`Invalid Model Name`);
        }
        const structure: any = {};
        const rewriteModelJson = (modelName: string) => {
            if (!modelName) {
                throw Error('model name invalid');
            }
            writeFileSync(join(dbpath, 'structures', `${modelName}.json`), JSON.stringify(structure, null, 2), 'utf8');
        };
        model.eachColumn((name, column) => {
            structure[name] = OrcaFileDriver.getColumnInfo(column);
            mkdirSync(join(dbpath, 'values', modelName, name), { recursive: true });
        });
        rewriteModelJson(modelName);
        model.onColumnRename((oldName, newName) => {
            structure[newName] = structure[oldName];
            delete structure[oldName];
            rewriteModelJson(model.getName() || '');
            renameSync(join(dbpath, 'values', oldName), join(dbpath, 'values', newName));
        });
        model.onColumnAdd((name, column) => {
            structure[name] = OrcaFileDriver.getColumnInfo(column);
            rewriteModelJson(model.getName() || '');
            mkdirSync(join(dbpath, 'values', name), { recursive: true });
        });
        model.onColumnDrop((name) => {
            delete structure[name];
            rewriteModelJson(model.getName() || '');
            rmSync(join(dbpath, 'values', name), { recursive: true });
        });
        model.onColumnModify((name, column) => {
            structure[name] = OrcaFileDriver.getColumnInfo(column);
            rewriteModelJson(model.getName() || '');
        });
        //do something 'dangeraus' to items
        const writeValue = (columnName: string, id: string, value: string) => {
            const modelName = model.getName();
            if (!modelName) {
                throw Error('model wrongfully victimized');
            }
            writeFileSync(join(dbpath, 'values', modelName, columnName, id), value, 'utf8');
        };
        model.rows.onInsert((_index, row) => {
            model.eachColumn((columnName, column) => {
                writeValue(columnName, row.id, OrcaFileDriver.getTextValue(column, row));
            });
        });
        model.rows.onDelete((_index, row) => {
            model.eachColumn((columnName) => {
                const modelName = model.getName();
                if (!modelName) {
                    throw Error('undeletable resource');
                }
                rmSync(join(dbpath, 'values', modelName, columnName, row.id));
            });
        });
        // uwu
    }
    private static getColumnInfo({ type, ref }: ColumnStructure): string {
        if (type === 'string' || type === 'number' || type === 'boolean') {
            return type;
        } else if (ref) {
            const modelRef = ref();
            if (typeof modelRef === 'string') {
                return `${type}:${modelRef}`;
            } else {
                const modelName = modelRef.getName();
                if (modelName) {
                    return `${type}:${modelName}`;
                } else {
                    throw Error('referenced model lost');
                }
            }
        } else {
            throw Error('reference lost');
        }
    }
    private static getTextValue({ values }: ColumnStructure, row: OrcaRow): string {
        const value = values.get(row);
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return value.toString();
        } else if (isRefference(value)) {
            const ref = value();
            return ref ? ref.id : '';
        } else if (isRefferences(value)) {
            const refs = value();
            return refs.map((row) => row.id).join('\n');
        } else {
            throw Error('row has invalid column type');
        }
    }
}
