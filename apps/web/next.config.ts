import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const api = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001";

const nextConfig: NextConfig = {
    reactStrictMode: true,
    ...(isProd ? {} : {
        async rewrites() {
            return [
                { source: "/api/auth/:path*", destination: "/api/auth/:path*" },
                { source: "/api/me", destination: `${api}/auth/me` },
                { source: "/api/boards", destination: `${api}/boards` },
                { source: "/api/boards/:path*", destination: `${api}/boards/:path*` },
                { source: "/api/columns", destination: `${api}/columns` },
                { source: "/api/columns/:path*", destination: `${api}/columns/:path*` },
                { source: "/api/issues", destination: `${api}/issues` },
                { source: "/api/issues/:path*", destination: `${api}/issues/:path*` }
            ];
        }
    })
};

export default nextConfig;