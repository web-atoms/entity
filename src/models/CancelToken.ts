// tslint:disable-next-line: interface-name
export default interface CancelToken {
    registerForCancel(a: () => void);
}
