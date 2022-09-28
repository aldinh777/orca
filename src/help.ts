import { StateList } from '@aldinh777/reactive/collection';
import RDBRow from './RDBRow';
import { RDBViewRow } from './RDBView';

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
