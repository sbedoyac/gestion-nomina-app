import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MainNav } from "@/components/main-nav";
import { getSession } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nómina Desposte",
  description: "Sistema de gestión de nómina por desposte de cerdo",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const user = session?.user;

  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex-col md:flex min-h-screen">
          <div className="border-b bg-white dark:bg-slate-950">
            <div className="flex h-16 items-center px-8">
              <MainNav currentUser={user} />
            </div>
          </div>
          <div className="flex-1 space-y-4 p-8 pt-6 bg-slate-50 dark:bg-slate-900">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
