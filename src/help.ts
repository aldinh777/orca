import type { Unsubscribe } from '@aldinh777/reactive/utils/subscription';
import type { State } from '@aldinh777/reactive';
import type { ReactiveList } from '@aldinh777/reactive/list';
import Row from './db/Row';
import Model from './db/Model';

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

export function isRefference(obj: unknown): obj is State<Row | null> {
    return typeof obj === 'function' && 'onChange' in obj;
}

export function isRefferences(obj: unknown): obj is ReactiveList<Row> {
    return typeof obj === 'function' && 'onInsert' in obj && 'onDelete' in obj && 'onUpdate' in obj;
}

export function modelEach(
    model: Model,
    cbEach: (row: Row) => void,
    cbDel?: (row: Row) => void
): Unsubscribe {
    model.selectRows('*', cbEach);
    const unsubs = [model.rows.onInsert((_, inserted) => cbEach(inserted))];
    if (cbDel) {
        unsubs.push(model.rows.onDelete((_, deleted) => cbDel(deleted)));
    }
    return () => {
        for (const unsub of unsubs) {
            unsub();
        }
    };
}

export function leach<B>(l: ReactiveList<B>, cbEach: (row: B) => void, cbDel?: (row: B) => void): Unsubscribe {
    for (const b of l()) {
        cbEach(b);
    }
    const unsubs = [l.onInsert((_, inserted) => cbEach(inserted))];
    if (cbDel) {
        unsubs.push(l.onDelete((_, deleted) => cbDel(deleted)));
    }
    return () => {
        for (const unsub of unsubs) {
            unsub();
        }
    };
}

export function removeInside<T>(list: ReactiveList<T>, item: T): void {
    const index = list().indexOf(item);
    if (index !== -1) {
        list.splice(index, 1);
    }
}
