<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { loadFlashcards, createFlashcard } from '@/entities/flashcard/flashcardStore'
import {
  loadLearningProgress,
  initializeNewCard,
  updateCardProgress,
  type Direction
} from '@/entities/learning-progress/LearningProgressStore'
import { getSelectedLanguage, setSelectedLanguage } from '@/app/storage/selectedLanguage'
import { loadFlashcardsFromPublicData } from '@/pages/flashcard-upload/zipImportHelpers'
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
const selectedLanguage = ref<string>('')
const recentPracticeIds = ref<string[]>([])
const COOLDOWN_SIZE = 4
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

function addToRecentPractice(practiceCard: PracticeCard) {
  const id = `${practiceCard.flashcardId}:${practiceCard.languageCode}:${practiceCard.direction}`
  recentPracticeIds.value = [id, ...recentPracticeIds.value].slice(0, COOLDOWN_SIZE)
}

function isInCooldown(practiceCard: PracticeCard): boolean {
  const id = `${practiceCard.flashcardId}:${practiceCard.languageCode}:${practiceCard.direction}`
  return recentPracticeIds.value.includes(id)
}

async function loadData() {
  const [cards, progressDocs] = await Promise.all([
    loadFlashcards(),
    loadLearningProgress()
  ])

  flashcards.value = cards

  const map = new Map<string, LearningProgress>()
  progressDocs.forEach((p) => {
    map.set(p.id, p)
  })
  progressMap.value = map
}

async function seedFromPublicData() {
  const seeded = await loadFlashcardsFromPublicData()
  for (const item of seeded) {
    await createFlashcard(item.image, item.languages)
  }
  if (seeded.length > 0) {
    await loadData()
  }
}

function getEligiblePracticeCards(): PracticeCard[] {
  const lang = selectedLanguage.value
  if (!lang) return []

  const eligible: PracticeCard[] = []

  for (const card of flashcards.value) {
    // Skip cards that don't have the selected language
    if (!(lang in card.languages)) continue

    const i2wProgressId = buildProgressId(card.id, lang, 'i2w')
    const w2iProgressId = buildProgressId(card.id, lang, 'w2i')

    const i2wProgress = progressMap.value.get(i2wProgressId)
    const w2iProgress = progressMap.value.get(w2iProgressId)

    // Check i2w eligibility
    const i2wPractice: PracticeCard = { flashcardId: card.id, languageCode: lang, direction: 'i2w' }
    if (!i2wProgress?.isDisabled && !isInCooldown(i2wPractice)) {
      eligible.push(i2wPractice)
    }

    // w2i is only eligible if i2w has been seen and i2w is not currently due
    if (i2wProgress && !w2iProgress?.isDisabled) {
      const i2wDue = new Date(i2wProgress.due)
      const now = new Date()

      // i2w must not be currently due for w2i to be eligible
      if (i2wDue > now) {
        const w2iPractice: PracticeCard = { flashcardId: card.id, languageCode: lang, direction: 'w2i' }
        if (!isInCooldown(w2iPractice)) {
          eligible.push(w2iPractice)
        }
      }
    }
  }

  return eligible
}

function selectNextCard(): { practiceCard: PracticeCard; flashcard: FlashCard } | null {
  const eligible = getEligiblePracticeCards()
  if (eligible.length === 0) return null

  // Separate into unseen and due
  const unseen: PracticeCard[] = []
  const due: PracticeCard[] = []

  for (const pc of eligible) {
    const progressId = buildProgressId(pc.flashcardId, pc.languageCode, pc.direction)
    const progress = progressMap.value.get(progressId)

    if (!progress) {
      unseen.push(pc)
    } else if (new Date(progress.due) <= new Date()) {
      due.push(pc)
    }
  }

  // 10% preference for new cards
  const preferUnseen = Math.random() < 0.1

  const pickRandom = <T>(items: T[]): T | null => {
    if (items.length === 0) return null
    return items[Math.floor(Math.random() * items.length)] ?? null
  }

  let selected: PracticeCard | null = null
  if (preferUnseen && unseen.length > 0) {
    selected = pickRandom(unseen)
  } else if (due.length > 0) {
    selected = pickRandom(due)
  } else if (unseen.length > 0) {
    selected = pickRandom(unseen)
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
  addToRecentPractice(currentPracticeCard.value)

  const next = selectNextCard()
  currentPracticeCard.value = next?.practiceCard ?? null
  currentFlashcard.value = next?.flashcard ?? null
}

async function handleKnownCardComplete(rating: Rating) {
  if (!currentPracticeCard.value) return

  const { flashcardId, languageCode, direction } = currentPracticeCard.value
  await updateCardProgress(flashcardId, languageCode, direction, rating)
  await loadData()
  addToRecentPractice(currentPracticeCard.value)

  const next = selectNextCard()
  currentPracticeCard.value = next?.practiceCard ?? null
  currentFlashcard.value = next?.flashcard ?? null
}

onMounted(async () => {
  await loadData()

  // Seed from public data if no flashcards exist
  if (flashcards.value.length === 0) {
    await seedFromPublicData()
  }

  // Get selected language or auto-select first available
  const stored = getSelectedLanguage()
  const availableLangs = new Set<string>()
  for (const card of flashcards.value) {
    for (const lang of Object.keys(card.languages)) {
      availableLangs.add(lang)
    }
  }

  if (stored && availableLangs.has(stored)) {
    selectedLanguage.value = stored
  } else if (availableLangs.size > 0) {
    // Default to German if available, otherwise first alphabetically
    const defaultLang = availableLangs.has('deu') ? 'deu' : Array.from(availableLangs).sort()[0]
    if (defaultLang) {
      selectedLanguage.value = defaultLang
      setSelectedLanguage(defaultLang)
    }
  }

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
      <p>No language selected.</p>
      <router-link
        to="/settings"
        class="btn btn-primary mt-2"
      >
        Go to Settings
      </router-link>
    </div>

    <div v-else-if="flashcards.length === 0">
      <p>No flashcards yet.</p>
      <router-link
        to="/upload"
        class="btn btn-primary mt-2"
      >
        Upload Flashcards
      </router-link>
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
