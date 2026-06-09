import { ref, watch } from 'vue'

const STORAGE_KEY = 'selectedLanguage'

export const selectedLanguage = ref<string>(localStorage.getItem(STORAGE_KEY) ?? '')

watch(selectedLanguage, (val) => {
  localStorage.setItem(STORAGE_KEY, val)
})
