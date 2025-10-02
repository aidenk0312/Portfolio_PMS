import 'next-auth';
declare module 'next-auth' {
    interface Session {
        userId?: string;
        apiToken?: string;
    }
}
