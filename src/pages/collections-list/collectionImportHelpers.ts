import { createFlashcard } from '@/entities/flashcard/flashcardStore'

interface CollectionEntry {
  language: string
  image: string
  expressions: string[]
  credits?: string
}

export async function fetchCollectionMetadata(): Promise<Record<string, string>> {
  const response = await fetch('/dont-translate-data/collections.json')
  return await response.json()
}

export async function fetchCollectionLanguages(collectionId: string): Promise<string[]> {
  const response = await fetch(`/dont-translate-data/collections/${collectionId}/languages.txt`)
  const text = await response.text()
  return text.split('\n').filter(line => line.trim())
}

function isImageFilename(value: string): boolean {
  return /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(value)
}

export async function importCollection(
  collectionId: string,
  collectionName: string,
  languageFilter?: string,
  onProgress?: (current: number, total: number) => void
): Promise<number> {
  const basePath = `/dont-translate-data/collections/${collectionId}`

  const response = await fetch(`${basePath}/flashcards.jsonl`)
  const text = await response.text()
  const allLines = text.split('\n').filter(line => line.trim())

  const lines = languageFilter
    ? allLines.filter(line => {
        const entry: CollectionEntry = JSON.parse(line)
        return entry.language === languageFilter
      })
    : allLines

  let imported = 0
  for (const line of lines) {
    const entry: CollectionEntry = JSON.parse(line)

    const imageResponse = await fetch(`${basePath}/${entry.image}`)
    const imageBlob = await imageResponse.blob()

    const expressions: (string | Blob)[] = []
    for (const expr of entry.expressions) {
      if (isImageFilename(expr)) {
        const exprResponse = await fetch(`${basePath}/${expr}`)
        expressions.push(await exprResponse.blob())
      } else {
        expressions.push(expr)
      }
    }

    await createFlashcard(imageBlob, entry.language, expressions, collectionName, entry.credits)
    imported++
    onProgress?.(imported, lines.length)
  }

  return imported
}
