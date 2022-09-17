export default class RDBError extends Error {
    constructor(msg: string) {
        super(msg);
        this.name = 'RDBError';
    }
}
