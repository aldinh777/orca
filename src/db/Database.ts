import OrcaError from '../error/OrcaError';
import Model from './Model';
import type Column from './Column';

export default class Database {
    private _models: Map<string, Model> = new Map();
    private _ref_waitlist: Map<string, Set<Column>> = new Map();

    // Model Operation
    createModel(name: string, columns: Record<string, Column>): Model {
        if (this.hasModel(name)) {
            throw new OrcaError('MODEL_EXISTS', name);
        }
        const model = new Model(this, name, columns);
        this._models.set(name, model);
        return model;
    }
    hasModel(name: string): boolean {
        return this._models.has(name);
    }
    selectModel(name: string): Model {
        const model = this._models.get(name);
        if (!model) {
            throw new OrcaError('MODEL_NOT_EXISTS', name);
        }
        return model;
    }
    eachModel(callback: (name: string, model: Model) => void): void {
        this._models.forEach((model, modelName) => callback(modelName, model));
    }

    // Relational Operation
    markUnresolved(modelName: string, column: Column) {
        if (!this._ref_waitlist.has(modelName)) {
            this._ref_waitlist.set(modelName, new Set());
        }
        const unresolvedColumns = this._ref_waitlist.get(modelName)!;
        unresolvedColumns.add(column);
    }
    resolveRefferences(name: string, model: Model) {
        if (!this._ref_waitlist.has(name)) {
            return;
        }
        const unresolvedColumns = this._ref_waitlist.get(name)!;
        for (const column of [...unresolvedColumns]) {
            column.refModel = model;
        }
        this._ref_waitlist.delete(name);
    }
}
