"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react"
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl"
import { getFallbackMessages, getMessagesForLocale } from "@/i18n/messages"
import {
  APP_LOCALE_TO_INTL_LOCALE,
  DEFAULT_LANGUAGE_SETTINGS,
  getSystemLocaleCandidates,
  LANGUAGE_SETTINGS_STORAGE_KEY,
  normalizeLanguageSettings,
  resolveAppLocale,
} from "@/lib/i18n"
import { getSystemLanguageSettings } from "@/lib/tauri"
import type { AppLocale, SystemLanguageSettings } from "@/lib/types"

interface AppI18nContextValue {
  appLocale: AppLocale
  languageSettings: SystemLanguageSettings
  languageSettingsLoaded: boolean
  setLanguageSettings: (settings: SystemLanguageSettings) => void
}

const AppI18nContext = createContext<AppI18nContextValue | null>(null)

function subscribeSystemLocale(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {}

  window.addEventListener("languagechange", onStoreChange)
  return () => {
    window.removeEventListener("languagechange", onStoreChange)
  }
}

function getSystemLocaleSnapshot(): string {
  return getSystemLocaleCandidates().join("|")
}

function getSystemLocaleServerSnapshot(): string {
  return ""
}

function loadPersistedLanguageSettings(): SystemLanguageSettings | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(LANGUAGE_SETTINGS_STORAGE_KEY)
    if (!raw) return null
    return normalizeLanguageSettings(JSON.parse(raw) as SystemLanguageSettings)
  } catch {
    return null
  }
}

function persistLanguageSettings(settings: SystemLanguageSettings) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(
      LANGUAGE_SETTINGS_STORAGE_KEY,
      JSON.stringify(settings)
    )
  } catch {
    // Ignore write failures (e.g. disabled storage).
  }
}

export function useAppI18n() {
  const context = useContext(AppI18nContext)
  if (!context) {
    throw new Error("useAppI18n must be used within AppI18nProvider")
  }
  return context
}

export function AppI18nProvider({ children }: { children: React.ReactNode }) {
  const [languageSettings, setLanguageSettingsState] =
    useState<SystemLanguageSettings>(
      () => loadPersistedLanguageSettings() ?? DEFAULT_LANGUAGE_SETTINGS
    )
  const [languageSettingsLoaded, setLanguageSettingsLoaded] = useState(false)
  const [messages, setMessages] = useState<AbstractIntlMessages>(
    getFallbackMessages()
  )

  const systemLocaleSnapshot = useSyncExternalStore(
    subscribeSystemLocale,
    getSystemLocaleSnapshot,
    getSystemLocaleServerSnapshot
  )
  const systemLocaleCandidates = useMemo(
    () => (systemLocaleSnapshot ? systemLocaleSnapshot.split("|") : []),
    [systemLocaleSnapshot]
  )

  const setLanguageSettings = useCallback(
    (settings: SystemLanguageSettings) => {
      const normalized = normalizeLanguageSettings(settings)
      setLanguageSettingsState(normalized)
      persistLanguageSettings(normalized)
    },
    []
  )

  useEffect(() => {
    let cancelled = false

    getSystemLanguageSettings()
      .then((settings) => {
        if (cancelled) return
        setLanguageSettings(settings)
      })
      .catch((err) => {
        console.error("[i18n] load language settings failed:", err)
      })
      .finally(() => {
        if (!cancelled) {
          setLanguageSettingsLoaded(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [setLanguageSettings])

  const appLocale = useMemo(
    () => resolveAppLocale(languageSettings, systemLocaleCandidates),
    [languageSettings, systemLocaleCandidates]
  )

  const intlLocale = APP_LOCALE_TO_INTL_LOCALE[appLocale]

  useEffect(() => {
    let cancelled = false

    getMessagesForLocale(appLocale)
      .then((nextMessages) => {
        if (!cancelled) {
          setMessages(nextMessages)
        }
      })
      .catch((err) => {
        console.error("[i18n] load locale messages failed:", err)
      })

    return () => {
      cancelled = true
    }
  }, [appLocale])

  useEffect(() => {
    document.documentElement.lang = intlLocale
  }, [intlLocale])

  const contextValue = useMemo<AppI18nContextValue>(
    () => ({
      appLocale,
      languageSettings,
      languageSettingsLoaded,
      setLanguageSettings,
    }),
    [appLocale, languageSettings, languageSettingsLoaded, setLanguageSettings]
  )

  return (
    <AppI18nContext.Provider value={contextValue}>
      <NextIntlClientProvider locale={intlLocale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </AppI18nContext.Provider>
  )
}
