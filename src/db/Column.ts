import type { State } from '@aldinh777/reactive';
import type { ReactiveList } from '@aldinh777/reactive/list';
import type Model from './Model';
import type Row from './Row';

export type ColumnTypeName = 'string' | 'number' | 'boolean' | 'ref' | 'refs';
export type ColumnType = string | number | boolean | State<Row | null> | ReactiveList<Row>;

export default class Column<T extends ColumnType = any> {
    values: WeakMap<Row, T> = new WeakMap();
    type: ColumnTypeName;
    verify: (value: any) => boolean;
    ref?: State<Model | string>;

    constructor(type: ColumnTypeName, verify: (value: any) => boolean, ref?: State<string | Model>) {
        this.type = type;
        this.verify = verify;
        this.ref = ref;
    }
}
