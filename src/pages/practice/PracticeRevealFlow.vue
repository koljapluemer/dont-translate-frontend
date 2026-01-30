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

// Shuffle array helper
const shuffleArray = <T>(arr: T[]): T[] => {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}

// For i2w (word on back): pick UP TO 3 random expressions, shuffled
const languageValue = computed((): (string | Blob)[] => {
  const expressions = props.flashcard.expressions
  if (!expressions || expressions.length === 0) return []

  // Pick up to 3 expressions
  const count = Math.min(3, expressions.length)

  if (count >= expressions.length) {
    // Return all, shuffled
    return shuffleArray(expressions)
  }

  // Shuffle and take first 'count' items
  const shuffled = shuffleArray(expressions)
  return shuffled.slice(0, count)
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
