import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EdgeTrust AI | Enterprise Edge Orchestrator",
  description: "Trust-Aware Edge Computing Resource Allocation Using Deep Reinforcement Learning & Anomaly Detection",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#090d16] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}