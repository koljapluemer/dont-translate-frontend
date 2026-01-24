<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps<{
  image: Blob
  languageValue?: string | Blob
  showLanguage?: boolean
  direction?: 'i2w' | 'w2i'
}>()

const imageUrl = ref<string>('')
const languageImageUrl = ref<string>('')

const isTextLanguage = computed(() => {
  return typeof props.languageValue === 'string'
})

const updateUrls = () => {
  // Clean up old URLs
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
  }
  if (languageImageUrl.value) {
    URL.revokeObjectURL(languageImageUrl.value)
  }

  // Create new URLs
  imageUrl.value = URL.createObjectURL(props.image)

  if (props.languageValue && props.languageValue instanceof Blob) {
    languageImageUrl.value = URL.createObjectURL(props.languageValue)
  } else {
    languageImageUrl.value = ''
  }
}

watch(() => props.image, updateUrls)
watch(() => props.languageValue, updateUrls)

onMounted(updateUrls)

onBeforeUnmount(() => {
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
  }
  if (languageImageUrl.value) {
    URL.revokeObjectURL(languageImageUrl.value)
  }
})
</script>

<template>
  <div
    class="card shadow bg-white text-gray-900 w-full"
    data-theme="light"
  >
    <div class="card-body gap-4 items-center">
      <!-- Image to Word: Show image first, then word -->
      <template v-if="direction === 'i2w' || !direction">
        <img
          :src="imageUrl"
          class="max-h-48 object-contain rounded"
          alt="Flashcard image"
        >

        <div
          v-if="showLanguage && languageValue"
          class="w-full border-t-2 border-dotted border-base-300 pt-4 text-center"
        >
          <span
            v-if="isTextLanguage"
            class="text-2xl"
          >
            {{ languageValue }}
          </span>
          <img
            v-else-if="languageImageUrl"
            :src="languageImageUrl"
            class="max-h-32 object-contain mx-auto"
            alt="Language representation"
          >
        </div>
      </template>

      <!-- Word to Image: Show word first, then image -->
      <template v-else-if="direction === 'w2i'">
        <div
          v-if="languageValue"
          class="text-center"
        >
          <span
            v-if="isTextLanguage"
            class="text-2xl"
          >
            {{ languageValue }}
          </span>
          <img
            v-else-if="languageImageUrl"
            :src="languageImageUrl"
            class="max-h-32 object-contain mx-auto"
            alt="Language representation"
          >
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
