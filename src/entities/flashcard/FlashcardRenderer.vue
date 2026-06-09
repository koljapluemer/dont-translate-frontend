<script setup lang="ts">
defineProps<{
  image: string
  languageValue?: string[]
  showLanguage?: boolean
  direction?: 'i2w' | 'w2i'
}>()
</script>

<template>
  <div
    class="card shadow bg-white text-gray-900 w-full"
    data-theme="light"
  >
    <div class="card-body gap-4 items-center">
      <!-- Image to Word: Show image first, then expressions -->
      <template v-if="direction === 'i2w' || !direction">
        <img
          :src="image"
          class="max-h-48 object-contain rounded"
          alt="Flashcard image"
        >

        <div
          v-if="showLanguage && languageValue && languageValue.length > 0"
          class="w-full border-t-2 border-dotted border-base-300 pt-4 text-center flex flex-col gap-2"
        >
          <span
            v-for="(expr, idx) in languageValue"
            :key="idx"
            class="text-2xl"
          >
            {{ expr }}
          </span>
        </div>
      </template>

      <!-- Word to Image: Show expressions first, then image -->
      <template v-else-if="direction === 'w2i'">
        <div
          v-if="languageValue && languageValue.length > 0"
          class="text-center flex flex-col gap-2"
        >
          <span
            v-for="(expr, idx) in languageValue"
            :key="idx"
            class="text-2xl"
          >
            {{ expr }}
          </span>
        </div>

        <div
          v-if="showLanguage"
          class="w-full border-t-2 border-dotted border-base-300 pt-4"
        >
          <img
            :src="image"
            class="max-h-48 object-contain rounded mx-auto"
            alt="Flashcard image"
          >
        </div>
      </template>
    </div>
  </div>
</template>
