import type { FlashCard } from '@/db/Flashcard'

export const loadFlashcardsForLanguage = async (language: string): Promise<FlashCard[]> => {
  const response = await fetch(`/data/${language}.jsonl`)
  if (!response.ok) return []
  const text = await response.text()
  const cards: FlashCard[] = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const data = JSON.parse(trimmed)
    cards.push({
      id: `flashcard:${data.image}`,
      image: `/data/images/${data.image}`,
      language: data.language,
      expressions: data.expressions,
      ...(data.credits && { credits: data.credits })
    })
  }
  return cards
}
