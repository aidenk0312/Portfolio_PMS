import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/app/components/Toast";
import { ReactNode } from "react";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});
const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Portfolio PMS",
    description: "Kanban-based PMS",
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
        <body
            className={`${geistSans.variable} ${geistMono.variable} font-sans min-h-dvh bg-surface-1 text-text antialiased`}
        >
        <ToastProvider>{children}</ToastProvider>
        </body>
        </html>
    );
}