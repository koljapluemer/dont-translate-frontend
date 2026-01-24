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
  const now = new Date()

  for (const card of flashcards.value) {
    if (!(lang in card.languages)) continue

    const w2iProgressId = buildProgressId(card.id, lang, 'w2i')
    const i2wProgressId = buildProgressId(card.id, lang, 'i2w')

    const w2iProgress = progressMap.value.get(w2iProgressId)
    const i2wProgress = progressMap.value.get(i2wProgressId)

    // w2i (word-to-image) is always eligible if not disabled
    if (!w2iProgress?.isDisabled) {
      eligible.push({ flashcardId: card.id, languageCode: lang, direction: 'w2i' })
    }

    // i2w (image-to-word) is only eligible if w2i has been seen and w2i is not currently due
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

  // Categorize cards
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

  // Filter functions
  const notSameFlashcard = (pc: PracticeCard) => pc.flashcardId !== lastFlashcardId.value

  // Priority 1: Avoid same flashcard twice (highest priority)
  // Priority 2: Avoid consecutive memorize flows (if last was memorize, prefer due cards)

  const pickRandom = <T>(items: T[]): T | null => {
    if (items.length === 0) return null
    return items[Math.floor(Math.random() * items.length)] ?? null
  }

  // Filter out same flashcard if possible
  const dueFiltered = due.filter(notSameFlashcard)
  const unseenFiltered = unseen.filter(notSameFlashcard)

  // If last was memorize, strongly prefer due cards to avoid back-to-back memorize
  if (lastWasMemorize.value) {
    // Try due cards (not same flashcard)
    if (dueFiltered.length > 0) {
      const selected = pickRandom(dueFiltered)
      if (selected) {
        const flashcard = flashcards.value.find(c => c.id === selected.flashcardId)
        if (flashcard) return { practiceCard: selected, flashcard }
      }
    }
    // Fall back to due cards (even same flashcard, but different direction)
    if (due.length > 0) {
      const selected = pickRandom(due)
      if (selected) {
        const flashcard = flashcards.value.find(c => c.id === selected.flashcardId)
        if (flashcard) return { practiceCard: selected, flashcard }
      }
    }
  }

  // Normal selection: 10% preference for new cards
  const preferUnseen = Math.random() < 0.1

  let selected: PracticeCard | null = null

  if (preferUnseen && unseenFiltered.length > 0) {
    selected = pickRandom(unseenFiltered)
  } else if (dueFiltered.length > 0) {
    selected = pickRandom(dueFiltered)
  } else if (unseenFiltered.length > 0) {
    selected = pickRandom(unseenFiltered)
  } else if (due.length > 0) {
    // Allow same flashcard as last resort
    selected = pickRandom(due)
  } else if (unseen.length > 0) {
    // Allow same flashcard as last resort
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

onMounted(async () => {
  await loadData()

  if (flashcards.value.length === 0) {
    await seedFromPublicData()
  }

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
