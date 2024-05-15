import { state, type State } from '@aldinh777/reactive';
import OrcaError from '../error/OrcaError';
import Model from './Model';

export interface ModelListener {
    modelRename: ((oldName: string, newName: string) => void)[];
    modelCreate: ((name: string, model: Model) => void)[];
    modelDrop: ((name: string, model: Model) => void)[];
}

export default class Cache {
    private _listeners: ModelListener = { modelRename: [], modelCreate: [], modelDrop: [] };
    private _models: Map<string, Model> = new Map();
    private _modelnames: WeakMap<Model, string> = new WeakMap();
    private _refwaiters: Map<string, State<Model | string>[]> = new Map();

    createModel(name: string, structure: object): Model {
        if (this._models.has(name)) {
            throw new OrcaError('MODEL_EXISTS', name);
        }
        const model = new Model(this, structure);
        this._models.set(name, model);
        this._modelnames.set(model, name);
        if (this._refwaiters.has(name)) {
            const waitlist = this._refwaiters.get(name);
            waitlist?.forEach((modelState) => {
                modelState(model);
            });
            this._refwaiters.delete(name);
        }
        for (const create of this._listeners.modelCreate) {
            create(name, model);
        }
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
    dropModel(name: string): void {
        if (!this._models.has(name)) {
            throw new OrcaError('MODEL_DROP_NOT_EXISTS', name);
        }
        const tb = this._models.get(name) as Model;
        Model.drop(tb);
        this._modelnames.delete(tb);
        this._models.delete(name);
        for (const drop of this._listeners.modelDrop) {
            drop(name, tb);
        }
    }
    renameModel(oldName: string, newName: string): void {
        if (!this._models.has(oldName)) {
            throw new OrcaError('MODEL_RENAME_NOT_EXISTS', oldName, newName);
        }
        if (this._models.has(newName)) {
            throw new OrcaError('MODEL_CLONE_JUTSU', oldName, newName);
        }
        const tb = this._models.get(oldName) as Model;
        this._models.delete(oldName);
        this._models.set(newName, tb);
        this._modelnames.set(tb, newName);
    }
    getModelName(model: Model): string | undefined {
        return this._modelnames.get(model);
    }
    getModelRelation(name: string): State<Model | string> {
        const model = this._models.get(name);
        const modelState = state(name as Model | string);
        if (model) {
            modelState(model);
        } else {
            if (!this._refwaiters.has(name)) {
                this._refwaiters.set(name, []);
            }
            const waitlist = this._refwaiters.get(name);
            waitlist?.push(modelState);
        }
        return modelState;
    }

    // Cache Events
    onModelRename(listener: (oldName: string, newName: string) => void): void {
        this._listeners.modelRename.push(listener);
    }
    onModelCreate(listener: (name: string, model: Model) => void): void {
        this._listeners.modelCreate.push(listener);
    }
    onModelDrop(listener: (name: string, model: Model) => void): void {
        this._listeners.modelDrop.push(listener);
    }

    eachModel(callback: (name: string, model: Model) => void): void {
        this._models.forEach((model, modelName) => callback(modelName, model));
    }
}
