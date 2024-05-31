import Column from './Column';

export function varchar() {
    return new Column<string>((input) => input);
}

export function int() {
    return new Column<number>((input) => input);
}

export function bool() {
    return new Column<boolean>((input) => input);
}
