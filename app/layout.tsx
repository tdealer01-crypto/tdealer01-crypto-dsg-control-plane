import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DSG Control Plane",
  description: "DSG control-plane dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
