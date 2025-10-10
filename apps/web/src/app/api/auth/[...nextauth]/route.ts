import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import * as jwt from "jsonwebtoken";
import type { JWT } from "next-auth/jwt";

const authOptions: any = {
    providers: [
        GitHub({
            clientId: process.env.GITHUB_ID as string,
            clientSecret: process.env.GITHUB_SECRET as string,
            allowDangerousEmailAccountLinking: true,
        }),
    ],
    pages: { signIn: "/login" },
    session: { strategy: "jwt" },
    callbacks: {
        async jwt({ token, account, profile }: { token: JWT; account?: any; profile?: any }): Promise<JWT> {
            const apiUrl = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001";
            const needUpsert = !!token.email && (!(token as any).userId || account?.provider === "github");
            if (needUpsert) {
                try {
                    const r = await fetch(`${apiUrl}/auth/upsert`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            email: token.email,
                            name: profile?.name ?? (token as any).name,
                            image: profile?.avatar_url ?? (token as any).picture,
                        }),
                    });
                    const data: any = await r.json().catch(() => ({}));
                    if (data?.userId) {
                        (token as any).userId = data.userId;
                    }
                } catch {}
            }
            if ((token as any).userId && token.email) {
                (token as any).apiToken = jwt.sign(
                    { sub: (token as any).userId, email: token.email },
                    process.env.NEXTAUTH_SECRET as string,
                    { algorithm: "HS256", expiresIn: "1h" },
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
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };