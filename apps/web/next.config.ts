import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const api = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001";

const nextConfig: NextConfig = {
    reactStrictMode: true,
    ...(isProd
        ? {}
        : {
            async rewrites() {
                return [
                    { source: "/api/:path*", destination: `${api}/:path*` },
                    { source: "/boards", destination: `${api}/boards` },
                    { source: "/boards/:path*", destination: `${api}/boards/:path*` },
                    { source: "/columns", destination: `${api}/columns` },
                    { source: "/columns/:path*", destination: `${api}/columns/:path*` },
                    { source: "/issues", destination: `${api}/issues` },
                    { source: "/issues/:path*", destination: `${api}/issues/:path*` },
                ];
            },
        }),
};

export default nextConfig;
