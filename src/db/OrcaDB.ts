import { state, type State } from '@aldinh777/reactive';
import OrcaError from '../error/OrcaError';
import Model from './Model';

export default class OrcaDB {
    private _models: Map<string, Model> = new Map();
    private _refwaiters: Map<string, State<Model | string>[]> = new Map();

    createModel(name: string, structure: object): Model {
        if (this.hasModel(name)) {
            throw new OrcaError('MODEL_EXISTS', name);
        }
        const model = new Model(this, name, structure);
        this._models.set(name, model);
        if (this._refwaiters.has(name)) {
            const waitlist = this._refwaiters.get(name);
            waitlist?.forEach((modelState) => {
                modelState(model);
            });
            this._refwaiters.delete(name);
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
    eachModel(callback: (name: string, model: Model) => void): void {
        this._models.forEach((model, modelName) => callback(modelName, model));
    }
}
