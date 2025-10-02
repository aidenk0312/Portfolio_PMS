import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001";

const nextConfig: NextConfig = {
    reactStrictMode: true,
    ...(isProd
        ? {}
        : {
            async rewrites() {
                return [
                    { source: "/api/boards",          destination: `${API}/boards` },
                    { source: "/api/boards/:path*",   destination: `${API}/boards/:path*` },
                    { source: "/api/columns",         destination: `${API}/columns` },
                    { source: "/api/columns/:path*",  destination: `${API}/columns/:path*` },
                    { source: "/api/issues",          destination: `${API}/issues` },
                    { source: "/api/issues/:path*",   destination: `${API}/issues/:path*` },
                    { source: "/boards",              destination: `${API}/boards` },
                    { source: "/boards/:path*",       destination: `${API}/boards/:path*` },
                    { source: "/columns",             destination: `${API}/columns` },
                    { source: "/columns/:path*",      destination: `${API}/columns/:path*` },
                    { source: "/issues",              destination: `${API}/issues` },
                    { source: "/issues/:path*",       destination: `${API}/issues/:path*` },
                ];
            },
        }),
};

export default nextConfig;
