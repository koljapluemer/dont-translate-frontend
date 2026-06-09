<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { loadFlashcardsForLanguage } from '@/entities/flashcard/flashcardStore'
import {
  loadLearningProgress,
  initializeNewCard,
  updateCardProgress,
  type Direction
} from '@/entities/learning-progress/LearningProgressStore'
import { selectedLanguage } from '@/app/storage/selectedLanguage'
import type { FlashCard } from '@/db/Flashcard'
import type { LearningProgress } from '@/db/LearningProgress'
import type { Rating } from 'ts-fsrs'
import type { PracticeCard } from './practiceTypes'
import PracticeMemorizeFlow from './PracticeMemorizeFlow.vue'
import PracticeRevealFlow from './PracticeRevealFlow.vue'

const flashcards = ref<FlashCard[]>([])
const progressMap = ref<Map<string, LearningProgress>>(new Map())
const currentPracticeCard = ref<PracticeCard | null>(null)
const currentFlashcard = ref<FlashCard | null>(null)
const lastFlashcardId = ref<string | null>(null)
const lastWasMemorize = ref(false)
const isLoading = ref(true)

const isCurrentCardNew = computed(() => {
  if (!currentPracticeCard.value) return false
  const { flashcardId, languageCode, direction } = currentPracticeCard.value
  const progressId = buildProgressId(flashcardId, languageCode, direction)
  return !progressMap.value.has(progressId)
})

function buildProgressId(flashcardId: string, lang: string, direction: Direction): string {
  const baseId = flashcardId.replace('flashcard:', '')
  return `learning-progress:${baseId}:${lang}:${direction}`
}

async function loadData() {
  if (!selectedLanguage.value) return

  const [cards, progressDocs] = await Promise.all([
    loadFlashcardsForLanguage(selectedLanguage.value),
    loadLearningProgress()
  ])

  flashcards.value = cards

  const map = new Map<string, LearningProgress>()
  progressDocs.forEach((p) => {
    map.set(p.id, p)
  })
  progressMap.value = map
}

function getEligiblePracticeCards(): PracticeCard[] {
  const lang = selectedLanguage.value
  if (!lang) return []

  const eligible: PracticeCard[] = []
  const now = new Date()

  for (const card of flashcards.value) {
    if (card.language !== lang) continue

    const w2iProgressId = buildProgressId(card.id, lang, 'w2i')
    const i2wProgressId = buildProgressId(card.id, lang, 'i2w')

    const w2iProgress = progressMap.value.get(w2iProgressId)
    const i2wProgress = progressMap.value.get(i2wProgressId)

    if (!w2iProgress?.isDisabled) {
      eligible.push({ flashcardId: card.id, languageCode: lang, direction: 'w2i' })
    }

    if (w2iProgress && !i2wProgress?.isDisabled) {
      const w2iDue = new Date(w2iProgress.due)
      if (w2iDue > now) {
        eligible.push({ flashcardId: card.id, languageCode: lang, direction: 'i2w' })
      }
    }
  }

  return eligible
}

function selectNextCard(): { practiceCard: PracticeCard; flashcard: FlashCard } | null {
  const eligible = getEligiblePracticeCards()
  if (eligible.length === 0) return null

  const now = new Date()

  const unseen: PracticeCard[] = []
  const due: PracticeCard[] = []

  for (const pc of eligible) {
    const progressId = buildProgressId(pc.flashcardId, pc.languageCode, pc.direction)
    const progress = progressMap.value.get(progressId)

    if (!progress) {
      unseen.push(pc)
    } else if (new Date(progress.due) <= now) {
      due.push(pc)
    }
  }

  const notSameFlashcard = (pc: PracticeCard) => pc.flashcardId !== lastFlashcardId.value

  const pickRandom = <T>(items: T[]): T | null => {
    if (items.length === 0) return null
    return items[Math.floor(Math.random() * items.length)] ?? null
  }

  const dueFiltered = due.filter(notSameFlashcard)
  const unseenFiltered = unseen.filter(notSameFlashcard)

  if (lastWasMemorize.value && dueFiltered.length > 0) {
    const selected = pickRandom(dueFiltered)
    if (selected) {
      const flashcard = flashcards.value.find(c => c.id === selected.flashcardId)
      if (flashcard) return { practiceCard: selected, flashcard }
    }
  }

  const preferUnseen = Math.random() < 0.1
  let selected: PracticeCard | null = null

  if (preferUnseen && unseenFiltered.length > 0) {
    selected = pickRandom(unseenFiltered)
  } else if (dueFiltered.length > 0) {
    selected = pickRandom(dueFiltered)
  } else if (unseenFiltered.length > 0) {
    selected = pickRandom(unseenFiltered)
  }

  if (!selected) return null

  const flashcard = flashcards.value.find(c => c.id === selected!.flashcardId)
  if (!flashcard) return null

  return { practiceCard: selected, flashcard }
}

async function handleNewCardComplete() {
  if (!currentPracticeCard.value) return

  const { flashcardId, languageCode, direction } = currentPracticeCard.value
  await initializeNewCard(flashcardId, languageCode, direction)
  await loadData()

  lastFlashcardId.value = flashcardId
  lastWasMemorize.value = true

  const next = selectNextCard()
  currentPracticeCard.value = next?.practiceCard ?? null
  currentFlashcard.value = next?.flashcard ?? null
}

async function handleKnownCardComplete(rating: Rating) {
  if (!currentPracticeCard.value) return

  const { flashcardId, languageCode, direction } = currentPracticeCard.value
  await updateCardProgress(flashcardId, languageCode, direction, rating)
  await loadData()

  lastFlashcardId.value = flashcardId
  lastWasMemorize.value = false

  const next = selectNextCard()
  currentPracticeCard.value = next?.practiceCard ?? null
  currentFlashcard.value = next?.flashcard ?? null
}

watch(selectedLanguage, async () => {
  isLoading.value = true
  lastFlashcardId.value = null
  lastWasMemorize.value = false
  await loadData()
  const next = selectNextCard()
  currentPracticeCard.value = next?.practiceCard ?? null
  currentFlashcard.value = next?.flashcard ?? null
  isLoading.value = false
})

onMounted(async () => {
  await loadData()
  const next = selectNextCard()
  currentPracticeCard.value = next?.practiceCard ?? null
  currentFlashcard.value = next?.flashcard ?? null
  isLoading.value = false
})
</script>

<template>
  <div class="flex flex-col gap-4 items-center w-full max-w-lg mx-auto flex-1 pt-10 px-4">
    <div v-if="isLoading">
      Loading...
    </div>

    <div v-else-if="!selectedLanguage">
      <p>No language selected. Use the settings gear to choose a language.</p>
    </div>

    <div v-else-if="!currentPracticeCard || !currentFlashcard">
      No cards available to practice right now.
    </div>

    <PracticeMemorizeFlow
      v-else-if="isCurrentCardNew"
      :practice-card="currentPracticeCard"
      :flashcard="currentFlashcard"
      @complete="handleNewCardComplete"
    />

    <PracticeRevealFlow
      v-else
      :practice-card="currentPracticeCard"
      :flashcard="currentFlashcard"
      @complete="handleKnownCardComplete"
    />
  </div>
</template>
