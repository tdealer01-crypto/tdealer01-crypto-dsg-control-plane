import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DSG Control Plane",
  description: "Enterprise control plane for DSG agents"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
