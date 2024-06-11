import { Model } from './Model';
import { ModelBuilder, type ModelOptions } from './ModelBuilder';

export class DataBase {
    #models: Map<string, Model<any>> = new Map();

    // Model Operation
    createModel(name: string, opts: Partial<ModelOptions> = {}): ModelBuilder {
        return new ModelBuilder(opts, (model) => {
            this.#models.set(name, model);
        });
    }
    eachModel(callback: (name: string, model: Model<any>) => void): void {
        this.#models.forEach((model, name) => callback(name, model));
    }
    hasModel(name: string): boolean {
        return this.#models.has(name);
    }
    from<T extends {}>(name: string): Model<T> | undefined {
        return this.#models.get(name);
    }
}
