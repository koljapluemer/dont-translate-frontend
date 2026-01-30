<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import FlashcardRenderer from '@/entities/flashcard/FlashcardRenderer.vue'
import type { FlashCard } from '@/db/Flashcard'
import type { PracticeCard } from './practiceTypes'

const props = defineProps<{
  practiceCard: PracticeCard
  flashcard: FlashCard
}>()

const emit = defineEmits<{
  (event: 'complete'): void
}>()

const durationMs = 5000
const remainingMs = ref(durationMs)
const phase = ref<'memorize' | 'recall' | 'reveal'>('memorize')
let timerId: number | null = null

const progressWidth = computed(() => `${(remainingMs.value / durationMs) * 100}%`)

// For w2i (word on front): pick ONE random expression
const languageValue = computed((): (string | Blob)[] => {
  const expressions = props.flashcard.expressions
  if (!expressions || expressions.length === 0) return []

  // Pick one random expression
  const idx = Math.floor(Math.random() * expressions.length)
  return [expressions[idx]!]
})

const stopTimer = () => {
  if (timerId) {
    window.clearInterval(timerId)
    timerId = null
  }
}

const startTimer = () => {
  stopTimer()
  remainingMs.value = durationMs
  phase.value = 'memorize'

  timerId = window.setInterval(() => {
    remainingMs.value = Math.max(0, remainingMs.value - 100)
    if (remainingMs.value <= 0) {
      stopTimer()
      phase.value = 'recall'
    }
  }, 100)
}

const handleReveal = () => {
  phase.value = 'reveal'
}

const handleDone = () => {
  emit('complete')
}

onMounted(startTimer)
onBeforeUnmount(stopTimer)
</script>

<template>
  <FlashcardRenderer
    :image="props.flashcard.image"
    :language-value="languageValue"
    :show-language="phase !== 'recall'"
    :direction="props.practiceCard.direction"
  />

  <div
    v-if="phase === 'memorize'"
    class="w-full mt-2 bg-base-200 h-2 rounded"
  >
    <div
      class="h-full bg-primary transition-[width] duration-100"
      :style="{ width: progressWidth }"
    />
  </div>

  <div
    v-if="phase === 'recall'"
    class=" mt-2 flex justify-center"
  >
    <button
      class="btn btn-outline"
      @click="handleReveal"
    >
      Reveal
    </button>
  </div>

  <div
    v-else-if="phase === 'reveal'"
    class="flex justify-center mt-2"
  >
    <button
      class="btn btn-outline"
      @click="handleDone"
    >
      Done
    </button>
  </div>
</template>
