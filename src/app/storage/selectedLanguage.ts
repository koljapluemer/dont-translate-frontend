const STORAGE_KEY = 'selectedLanguage'

export function getSelectedLanguage(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function setSelectedLanguage(lang: string): void {
  localStorage.setItem(STORAGE_KEY, lang)
}
