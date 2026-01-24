<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import FlashcardRenderer from '@/entities/flashcard/FlashcardRenderer.vue'
import type { FlashCard } from '@/db/Flashcard'
import type { PracticeCard } from './practiceTypes'
import { Rating } from 'ts-fsrs'

const props = defineProps<{
  practiceCard: PracticeCard
  flashcard: FlashCard
}>()

const emit = defineEmits<{
  (event: 'complete', rating: Rating): void
}>()

const isRevealed = ref(false)

const languageValue = computed(() => {
  return props.flashcard.languages[props.practiceCard.languageCode]
})

watch(() => props.practiceCard, () => {
  isRevealed.value = false
})

const handleReveal = () => {
  isRevealed.value = true
}

const handleRating = (rating: Rating) => {
  emit('complete', rating)
}
</script>

<template>
  <FlashcardRenderer
    :image="props.flashcard.image"
    :language-value="languageValue"
    :show-language="isRevealed"
    :direction="props.practiceCard.direction"
  />

  <div
    v-if="!isRevealed"
    class="flex justify-center mt-2"
  >
    <button
      class="btn btn-outline"
      @click="handleReveal"
    >
      Reveal
    </button>
  </div>

  <div
    v-else
    class="flex flex-col md:flex-row justify-center gap-2 mt-2"
  >
    <button
      class="btn btn-outline"
      @click="handleRating(Rating.Again)"
    >
      Again
    </button>
    <button
      class="btn btn-outline"
      @click="handleRating(Rating.Hard)"
    >
      Hard
    </button>
    <button
      class="btn btn-outline"
      @click="handleRating(Rating.Good)"
    >
      Good
    </button>
    <button
      class="btn btn-outline"
      @click="handleRating(Rating.Easy)"
    >
      Easy
    </button>
  </div>
</template>
