import type { Config } from 'tailwindcss';

export default {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './src/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    DEFAULT: 'hsl(217 91% 60%)',
                    hover: 'hsl(217 91% 56%)',
                    fg: 'hsl(0 0% 100%)',
                    soft: 'hsl(214 95% 93%)',
                    ring: 'hsl(217 91% 60%)',
                },
                surface: {
                    0: 'hsl(0 0% 100%)',
                    1: 'hsl(210 40% 98%)',
                    2: 'hsl(210 40% 96%)',
                },
                text: {
                    DEFAULT: 'hsl(222 47% 11%)',
                    mute: 'hsl(215 16% 47%)',
                },
                danger: {
                    DEFAULT: 'hsl(0 84% 60%)',
                    hover: 'hsl(0 72% 51%)',
                    soft: 'hsl(0 93% 94%)',
                    fg: 'white',
                },
                ok: {
                    DEFAULT: 'hsl(142 71% 45%)',
                    soft: 'hsl(142 76% 97%)',
                    fg: 'white',
                },
                warn: {
                    DEFAULT: 'hsl(38 92% 50%)',
                    soft: 'hsl(48 100% 96%)',
                    fg: 'black',
                },
            },
            borderRadius: {
                xl: '14px',
                '2xl': '16px',
            },
            boxShadow: {
                card: '0 1px 2px 0 rgb(0 0 0 / 0.05), 0 6px 16px -8px rgb(0 0 0 / 0.15)',
                overlay: '0 10px 30px -10px rgb(0 0 0 / 0.35)',
            },
            transitionTimingFunction: {
                soft: 'cubic-bezier(.2,.8,.2,1)',
            },
        },
    },
    plugins: [],
} satisfies Config;
