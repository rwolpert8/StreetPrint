import type { Metadata } from "next";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "StreetPrint — City guessing game",
  description: "Guess the city from its street map. Use country, continent, distance, and direction clues to find the answer.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
