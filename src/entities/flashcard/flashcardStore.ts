import { db } from '@/db/db'
import type { FlashCard } from '@/db/Flashcard'

const buildFlashcardId = (): string => `flashcard:${crypto.randomUUID()}`

export const loadFlashcards = async (): Promise<FlashCard[]> => {
  return await db.flashcards.toArray()
}

export const createFlashcard = async (
  image: Blob,
  language: string,
  expressions: (string | Blob)[],
  collection: string,
  credits?: string
): Promise<FlashCard> => {
  const id = buildFlashcardId()

  const card: FlashCard = {
    id,
    image,
    language,
    expressions,
    collection,
    ...(credits && { credits })
  }

  await db.flashcards.add(card)
  return card
}

export const deleteFlashcard = async (id: string): Promise<void> => {
  await db.flashcards.delete(id)
}

export const getFlashcardById = async (id: string): Promise<FlashCard> => {
  const card = await db.flashcards.get(id)
  if (!card) throw new Error(`Flashcard ${id} not found`)
  return card
}

export const getAvailableLanguages = async (): Promise<string[]> => {
  const cards = await db.flashcards.toArray()
  const langSet = new Set<string>()
  for (const card of cards) {
    langSet.add(card.language)
  }
  return Array.from(langSet).sort()
}
