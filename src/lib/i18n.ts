import type { AppLocale, SystemLanguageSettings } from "@/lib/types"

export const APP_LOCALES: readonly AppLocale[] = ["en", "zh_cn", "zh_tw"]
const FALLBACK_APP_LOCALE: AppLocale = "en"
export const LANGUAGE_SETTINGS_STORAGE_KEY = "codeg.system_language_settings"
export type IntlLocale = "en" | "zh-CN" | "zh-TW"

export const DEFAULT_LANGUAGE_SETTINGS: SystemLanguageSettings = {
  mode: "system",
  language: FALLBACK_APP_LOCALE,
}

export const APP_LOCALE_TO_INTL_LOCALE: Record<AppLocale, IntlLocale> = {
  en: "en",
  zh_cn: "zh-CN",
  zh_tw: "zh-TW",
}

export function isAppLocale(value: unknown): value is AppLocale {
  return APP_LOCALES.includes(value as AppLocale)
}

export function normalizeLanguageSettings(
  settings: Partial<SystemLanguageSettings> | null | undefined
): SystemLanguageSettings {
  const mode = settings?.mode === "manual" ? "manual" : "system"
  const language = isAppLocale(settings?.language)
    ? settings.language
    : FALLBACK_APP_LOCALE

  return {
    mode,
    language,
  }
}

function mapSystemLocaleToAppLocale(localeTag: string): AppLocale | null {
  const normalized = localeTag.trim().toLowerCase().replace(/_/g, "-")

  if (!normalized) return null
  if (normalized.startsWith("en")) return "en"

  if (
    normalized.startsWith("zh-hant") ||
    normalized.endsWith("-tw") ||
    normalized.endsWith("-hk") ||
    normalized.endsWith("-mo")
  ) {
    return "zh_tw"
  }

  if (normalized.startsWith("zh")) return "zh_cn"

  return null
}

export function getSystemLocaleCandidates(): string[] {
  if (typeof navigator === "undefined") return []

  const candidates = [
    ...(navigator.languages ?? []),
    navigator.language,
  ].filter((value): value is string => Boolean(value))

  return [...new Set(candidates)]
}

export function resolveSystemLocale(candidates: string[]): AppLocale | null {
  for (const candidate of candidates) {
    const resolved = mapSystemLocaleToAppLocale(candidate)
    if (resolved) return resolved
  }

  return null
}

export function resolveAppLocale(
  settings: SystemLanguageSettings,
  systemLocaleCandidates: string[]
): AppLocale {
  if (settings.mode === "manual") {
    return settings.language
  }

  return resolveSystemLocale(systemLocaleCandidates) ?? FALLBACK_APP_LOCALE
}
