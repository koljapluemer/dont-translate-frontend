<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { Settings } from 'lucide-vue-next'
import ToastContainer from './toast/ToastContainer.vue'
import { selectedLanguage } from './storage/selectedLanguage'

interface LanguageInfo {
  displayName: string
  symbols: string[]
}

const settingsOpen = ref(false)
const allLanguages = ref<Record<string, LanguageInfo>>({})

onMounted(async () => {
  try {
    const res = await fetch('/data/available_languages.json')
    allLanguages.value = await res.json()
  } catch {
    console.warn('Could not load available_languages.json')
  }

  if (!selectedLanguage.value) {
    const codes = Object.keys(allLanguages.value)
    const defaultLang = codes.includes('deu') ? 'deu' : codes[0]
    if (defaultLang) selectedLanguage.value = defaultLang
  }
})
</script>

<template>
  <div class="flex flex-col justify-between items-center w-full h-full overflow-x-hidden">
    <nav class="navbar bg-base-200 w-full">
      <div class="flex-1" />
      <div class="flex-none">
        <button
          class="btn btn-ghost"
          @click="settingsOpen = true"
        >
          <Settings />
          <span class="hidden sm:inline">Settings</span>
        </button>
      </div>
    </nav>

    <main class="flex-1 flex flex-col justify-center w-full max-w-4xl mx-auto px-4">
      <RouterView />
    </main>

    <ToastContainer />

    <!-- Settings modal -->
    <dialog
      class="modal"
      :class="{ 'modal-open': settingsOpen }"
    >
      <div class="modal-box">
        <h3 class="text-lg font-bold mb-4">
          Settings
        </h3>
        <div class="form-control w-full">
          <label class="label">
            <span class="label-text">Practice Language</span>
          </label>
          <select
            v-model="selectedLanguage"
            class="select select-bordered w-full"
          >
            <option
              v-for="(info, code) in allLanguages"
              :key="code"
              :value="code"
            >
              {{ info.symbols[0] }} {{ info.displayName }}
            </option>
          </select>
        </div>
        <div class="modal-action">
          <button
            class="btn"
            @click="settingsOpen = false"
          >
            Close
          </button>
        </div>
      </div>
      <div
        class="modal-backdrop"
        @click="settingsOpen = false"
      />
    </dialog>
  </div>
</template>

<style>
@import "tailwindcss";
@plugin "daisyui";
</style>
