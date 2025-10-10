export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import * as jwt from 'jsonwebtoken';

const { GITHUB_ID, GITHUB_SECRET, NEXTAUTH_SECRET, NEXT_PUBLIC_API_BASE } = process.env;

if (!GITHUB_ID || !GITHUB_SECRET) {
    throw new Error('NextAuth config: GITHUB_ID / GITHUB_SECRET is missing');
}
if (!NEXTAUTH_SECRET || NEXTAUTH_SECRET.length < 32) {
    throw new Error('NextAuth config: NEXTAUTH_SECRET must be 32+ characters');
}

const handler = NextAuth({
    providers: [
        GitHub({
            clientId: GITHUB_ID!,
            clientSecret: GITHUB_SECRET!,
        }),
    ],
    pages: { signIn: '/login' },
    session: { strategy: 'jwt' },
    debug: true,
    callbacks: {
        async jwt({ token, account, profile }: any) {
            const apiUrl = NEXT_PUBLIC_API_BASE || 'http://localhost:3001';
            const needUpsert = !!token?.email && (!(token as any).userId || account?.provider === 'github');
            if (needUpsert) {
                try {
                    const r = await fetch(`${apiUrl}/auth/upsert`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: token.email,
                            name: profile?.name ?? (token as any).name,
                            image: profile?.avatar_url ?? (token as any).picture,
                        }),
                    });
                    const data: any = await r.json().catch(() => ({}));
                    if (data?.userId) (token as any).userId = data.userId;
                } catch {}
            }
            if ((token as any).userId && token?.email) {
                (token as any).apiToken = jwt.sign(
                    { sub: (token as any).userId, email: token.email },
                    NEXTAUTH_SECRET!,
                    { algorithm: 'HS256', expiresIn: '1h' },
                );
            }
            return token;
        },
        async session({ session, token }: any) {
            (session as any).userId = (token as any).userId;
            (session as any).apiToken = (token as any).apiToken;
            return session;
        },
    },
    secret: NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
