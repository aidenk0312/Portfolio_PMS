export const bus = new EventTarget();

export function emit(name: string, detail?: any) {
    bus.dispatchEvent(new CustomEvent(name, { detail }));
}

export function on<T = any>(name: string, fn: (e: CustomEvent<T>) => void) {
    const h = (e: Event) => fn(e as CustomEvent<T>);
    bus.addEventListener(name, h as any);
    return () => bus.removeEventListener(name, h as any);
}
