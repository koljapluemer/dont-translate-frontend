import JSZip from 'jszip'

export interface ParsedFlashcard {
  image: Blob
  language: string
  expressions: (string | Blob)[]
  credits?: string
}

interface JsonlEntry {
  language: string
  image: string
  expressions: string[]
  credits?: string
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']

function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.')
  return parts.length > 1 ? (parts[parts.length - 1] ?? '') : ''
}

function isImageFile(filename: string): boolean {
  return IMAGE_EXTENSIONS.includes(getExtension(filename))
}

export async function parseFlashcardsFromJsonl(file: File): Promise<ParsedFlashcard[]> {
  const zip = await JSZip.loadAsync(file)

  // Find flashcards.jsonl anywhere in the ZIP
  const jsonlFiles = zip.file(/flashcards\.jsonl$/)
  if (jsonlFiles.length === 0) {
    throw new Error('flashcards.jsonl not found in ZIP')
  }
  const jsonlFile = jsonlFiles[0]!

  const jsonlContent = await jsonlFile.async('string')
  const lines = jsonlContent.split('\n').filter((line: string) => line.trim())

  // Build a map of filename -> JSZipObject for quick lookup
  const fileMap = new Map<string, JSZip.JSZipObject>()
  zip.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir) {
      // Get just the filename (no directory path)
      const filename = relativePath.split('/').pop() || relativePath
      fileMap.set(filename, zipEntry)
    }
  })

  const flashcards: ParsedFlashcard[] = []

  for (const line of lines) {
    let entry: JsonlEntry
    try {
      entry = JSON.parse(line)
    } catch {
      console.warn('Invalid JSON line:', line)
      continue
    }

    if (!entry.language || !entry.image || !entry.expressions || !Array.isArray(entry.expressions)) {
      console.warn('Missing required fields in line:', line)
      continue
    }

    // Resolve image
    const imageFile = fileMap.get(entry.image)
    if (!imageFile) {
      console.warn('Image file not found:', entry.image)
      continue
    }
    const imageBlob = await imageFile.async('blob')

    // Resolve expressions: check if each is a valid filename in ZIP → Blob, else string
    const resolvedExpressions: (string | Blob)[] = []
    for (const expr of entry.expressions) {
      const exprFile = fileMap.get(expr)
      if (exprFile && isImageFile(expr)) {
        resolvedExpressions.push(await exprFile.async('blob'))
      } else {
        resolvedExpressions.push(expr)
      }
    }

    flashcards.push({
      image: imageBlob,
      language: entry.language,
      expressions: resolvedExpressions,
      ...(entry.credits && { credits: entry.credits })
    })
  }

  return flashcards
}
