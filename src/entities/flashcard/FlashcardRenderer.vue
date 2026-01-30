<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps<{
  image: Blob
  languageValue?: (string | Blob)[]
  showLanguage?: boolean
  direction?: 'i2w' | 'w2i'
}>()

const imageUrl = ref<string>('')
const expressionUrls = ref<Map<number, string>>(new Map())

const updateUrls = () => {
  // Clean up old URLs
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
  }
  expressionUrls.value.forEach(url => URL.revokeObjectURL(url))
  expressionUrls.value = new Map()

  // Create new URLs
  imageUrl.value = URL.createObjectURL(props.image)

  // Create URLs for blob expressions
  if (props.languageValue) {
    const newUrls = new Map<number, string>()
    props.languageValue.forEach((expr, idx) => {
      if (expr instanceof Blob) {
        newUrls.set(idx, URL.createObjectURL(expr))
      }
    })
    expressionUrls.value = newUrls
  }
}

const getExpressionUrl = (idx: number): string => {
  return expressionUrls.value.get(idx) || ''
}

const isTextExpression = (expr: string | Blob): expr is string => {
  return typeof expr === 'string'
}

watch(() => props.image, updateUrls)
watch(() => props.languageValue, updateUrls, { deep: true })

onMounted(updateUrls)

onBeforeUnmount(() => {
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
  }
  expressionUrls.value.forEach(url => URL.revokeObjectURL(url))
})
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
          :src="imageUrl"
          class="max-h-48 object-contain rounded"
          alt="Flashcard image"
        >

        <div
          v-if="showLanguage && languageValue && languageValue.length > 0"
          class="w-full border-t-2 border-dotted border-base-300 pt-4 text-center flex flex-col gap-2"
        >
          <template
            v-for="(expr, idx) in languageValue"
            :key="idx"
          >
            <span
              v-if="isTextExpression(expr)"
              class="text-2xl"
            >
              {{ expr }}
            </span>
            <img
              v-else
              :src="getExpressionUrl(idx)"
              class="max-h-32 object-contain mx-auto"
              alt="Expression"
            >
          </template>
        </div>
      </template>

      <!-- Word to Image: Show expressions first, then image -->
      <template v-else-if="direction === 'w2i'">
        <div
          v-if="languageValue && languageValue.length > 0"
          class="text-center flex flex-col gap-2"
        >
          <template
            v-for="(expr, idx) in languageValue"
            :key="idx"
          >
            <span
              v-if="isTextExpression(expr)"
              class="text-2xl"
            >
              {{ expr }}
            </span>
            <img
              v-else
              :src="getExpressionUrl(idx)"
              class="max-h-32 object-contain mx-auto"
              alt="Expression"
            >
          </template>
        </div>

        <div
          v-if="showLanguage"
          class="w-full border-t-2 border-dotted border-base-300 pt-4"
        >
          <img
            :src="imageUrl"
            class="max-h-48 object-contain rounded mx-auto"
            alt="Flashcard image"
          >
        </div>
      </template>
    </div>
  </div>
</template>
