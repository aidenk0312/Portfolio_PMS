declare module 'next-auth' {
    export * from 'next-auth/core';
    const _default: any;
    export default _default;
}

declare module 'next-auth/react' {
    export const signIn: any;
    export const signOut: any;
    export const getSession: any;
    export const useSession: any;
    export const SessionProvider: any;
}

declare module 'next-auth/providers/github' {
    const GitHub: any;
    export default GitHub;
}

declare module 'next-auth/jwt' {
    export type JWT = any;
}

declare module 'jsonwebtoken' {
    export const sign: any;
    export const verify: any;
    const _default: any;
    export default _default;
}
