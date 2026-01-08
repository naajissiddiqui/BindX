"use client";
import "jsvectormap/dist/jsvectormap.css";
import "flatpickr/dist/flatpickr.min.css";
import "@/css/style.css";
import React, { useEffect, useState } from "react";
import { SessionProvider } from "next-auth/react";
import { UserProvider } from "./context/UserContext";
import Script from "next/script";
import * as Ably from "ably";
import { AblyProvider, ChannelProvider } from "ably/react";
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const client = new Ably.Realtime({
    key: process.env.ABLY_API_KEY,
  });
  return (
    <html lang="en">
      {/* <Script src="https://unpkg.com/@rdkit/rdkit/dist/RDKit_minimal.js" /> */}
      <body suppressHydrationWarning={true}>
        <SessionProvider>
          <UserProvider>{children}</UserProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
