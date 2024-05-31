import { Model } from './Model';

type DoneCallback = (model: Model) => any;

export class ModelBuilder {
    model: Model;
    build: DoneCallback;

    constructor(build: DoneCallback) {
        this.model = new Model();
        this.build = build;
    }
    varchar(_name: string, _opts?: { required: boolean }) {
        return this;
    }
    text(_name: string) {
        return this;
    }
    int(_name: string) {
        return this;
    }
    float(_name: string) {
        return this;
    }
    bool(_name: string) {
        return this;
    }
    date(_name: string) {
        return this;
    }
    done(): Model {
        this.build(this.model);
        return this.model;
    }
}
