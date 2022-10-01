import { OperationHandler, StateList } from '@aldinh777/reactive/collection';
import { createMultiSubscriptions, Subscription } from '@aldinh777/reactive/util';
import RDBRow from './db/RDBRow';
import RDBTable from './db/RDBTable';
import { RDBViewRow } from './view/RDBView';

/**
 * Digit limit for randomshit function for it to execute
 * another randomshit recursively because Math.random() * somenumber
 * would result in base 10 number making radix end with ...000
 *
 * This constant name is based on a virtual youtuber
 * [Minato Aqua](https://www.youtube.com/channel/UC1opHUrw8rvnsadT-iGp7Cg)
 * because i write this code with her as a background
 */
export const AQUA_TAN_DIGIT_LIMIT = 8;

export function randomShit(digit: number, radix: number = 36): string {
    const limitedDigit = digit > AQUA_TAN_DIGIT_LIMIT ? AQUA_TAN_DIGIT_LIMIT : digit;
    return (
        Math.floor(Math.random() * radix ** limitedDigit)
            .toString(radix)
            .padStart(limitedDigit, '0') +
        (digit > AQUA_TAN_DIGIT_LIMIT ? randomShit(digit - AQUA_TAN_DIGIT_LIMIT) : '')
    );
}

export function tableEach(
    table: RDBTable,
    cbEach: (row: RDBRow) => void,
    cbDel?: (row: RDBRow) => void
): Subscription<RDBTable, OperationHandler<string, RDBRow>> {
    table.selectRows('*', cbEach);
    const subs = [table.onInsert((_, inserted) => cbEach(inserted))];
    if (cbDel) {
        subs.push(table.onDelete((_, deleted) => cbDel(deleted)));
    }
    return createMultiSubscriptions(table, (_, row) => cbEach(row), subs);
}

export function leach<B>(
    l: StateList<B>,
    cbEach: (row: B) => void,
    cbDel?: (row: B) => void
): Subscription<StateList<B>, OperationHandler<number, B>> {
    for (const b of l.raw) {
        cbEach(b);
    }
    const subs = [l.onInsert((_, inserted) => cbEach(inserted))];
    if (cbDel) {
        subs.push(l.onDelete((_, deleted) => cbDel(deleted)));
    }
    return createMultiSubscriptions(l, (_: number, row: B) => cbEach(row), subs);
}

export function removeInside<T>(list: StateList<T>, item: T): void {
    const index = list.raw.indexOf(item);
    if (index !== -1) {
        list.splice(index, 1);
    }
}

export function removeDeeper(
    list: StateList<RDBViewRow>,
    row: RDBRow,
    mapper: WeakMap<RDBRow, RDBViewRow>
): void {
    const ouch = mapper.get(row);
    if (ouch) {
        removeInside(list, ouch);
    }
}
