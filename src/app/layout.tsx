import type { Metadata } from "next"
import "./globals.css"
import { JetBrains_Mono } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { AppI18nProvider } from "@/components/i18n-provider"
import { ThemeProvider } from "@/components/theme-provider"

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "codeg",
  description: "AI Coding Agent Conversation Manager",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={jetbrainsMono.variable} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider locale="en" messages={null}>
          <AppI18nProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </AppI18nProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
