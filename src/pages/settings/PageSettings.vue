<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getSelectedLanguage, setSelectedLanguage } from '@/app/storage/selectedLanguage'
import { getAvailableLanguages } from '@/entities/flashcard/flashcardStore'

interface LanguageInfo {
  displayName: string
  symbols: string[]
}

const allLanguages = ref<Record<string, LanguageInfo>>({})
const availableLanguages = ref<string[]>([])
const selectedLang = ref<string>('')

const displayLanguages = computed(() => {
  return availableLanguages.value.map(code => ({
    code,
    displayName: allLanguages.value[code]?.displayName || code,
    symbol: allLanguages.value[code]?.symbols?.[0] || ''
  }))
})

const handleLanguageChange = (e: Event) => {
  const target = e.target as HTMLSelectElement
  selectedLang.value = target.value
  setSelectedLanguage(target.value)
}

onMounted(async () => {
  // Load all language definitions
  try {
    const response = await fetch('/languages.json')
    allLanguages.value = await response.json()
  } catch {
    console.warn('Could not load languages.json')
  }

  // Get languages available in the database
  availableLanguages.value = await getAvailableLanguages()

  // Load current selection
  const current = getSelectedLanguage()
  if (current && availableLanguages.value.includes(current)) {
    selectedLang.value = current
  } else if (availableLanguages.value.length > 0) {
    // Default to German if available, otherwise first
    const defaultLang = availableLanguages.value.includes('deu') ? 'deu' : availableLanguages.value[0]
    if (defaultLang) {
      selectedLang.value = defaultLang
      setSelectedLanguage(defaultLang)
    }
  }
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">
      Settings
    </h1>

    <div class="form-control w-full max-w-xs">
      <label class="label">
        <span class="label-text">Practice Language</span>
      </label>
      <select
        :value="selectedLang"
        class="select select-bordered w-full"
        @change="handleLanguageChange"
      >
        <option
          v-if="displayLanguages.length === 0"
          value=""
          disabled
        >
          No languages available
        </option>
        <option
          v-for="lang in displayLanguages"
          :key="lang.code"
          :value="lang.code"
        >
          {{ lang.symbol }} {{ lang.displayName }} ({{ lang.code }})
        </option>
      </select>
      <label class="label">
        <span class="label-text-alt">
          Only languages with flashcards are shown
        </span>
      </label>
    </div>
  </div>
</template>
