export type AuthEventType = 'auth:401' | 'auth:403';

type Sub = (type: AuthEventType, payload?: unknown) => void;
const subs = new Set<Sub>();

export function onAuthEvent(cb: Sub) {
    subs.add(cb);
    return () => {
        subs.delete(cb);
    };
}

export function emitAuthEvent(type: AuthEventType, payload?: unknown) {
    subs.forEach((fn) => fn(type, payload));
}
