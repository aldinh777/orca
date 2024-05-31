import Column from './Column';
import type Row from './Row';

export function varchar() {
    return new Column<string>((input) => input);
}

export function int() {
    return new Column<number>((input) => input);
}

export function bool() {
    return new Column<boolean>((input) => input);
}

export function ref(modelName: string) {
    return new Column<Row | null>((input) => input, modelName);
}

export function refs(modelName: string) {
    return new Column<Row[]>((input) => input, modelName);
}
