import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReactNode } from "react";
import { ToastProvider } from "@/components/Toast";
import SessionProv from "@/components/session-provider";
import RbacBoot from "@/components/RbacBoot";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Portfolio PMS",
    description: "Kanban-based PMS",
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} font-sans min-h-dvh bg-surface-1 text-text antialiased`}>
        <SessionProv>
            <RbacBoot />
            <ToastProvider>{children}</ToastProvider>
        </SessionProv>
        </body>
        </html>
    );
}
