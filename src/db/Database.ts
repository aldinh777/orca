import { Model } from './Model';
import { ModelBuilder } from './ModelBuilder';

export default class DataBase {
    #models: Map<string, Model> = new Map();

    // Model Operation
    createModel(name: string, _opts?: { id_type: 'increment' | 'uuid' }): ModelBuilder {
        return new ModelBuilder((model) => {
            this.#models.set(name, model);
        });
    }
    eachModel(callback: (name: string, model: Model) => void): void {
        this.#models.forEach((model, name) => callback(name, model));
    }
    hasModel(name: string): boolean {
        return this.#models.has(name);
    }
    from(name: string): Model | undefined {
        return this.#models.get(name);
    }
}
