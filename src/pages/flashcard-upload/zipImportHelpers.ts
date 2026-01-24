import JSZip from 'jszip'

export interface ParsedFlashcard {
  image: Blob
  languages: { [iso3Code: string]: string | Blob }
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
const TEXT_EXTENSIONS = ['txt']

function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.')
  return parts.length > 1 ? (parts[parts.length - 1] ?? '') : ''
}

function isImageFile(filename: string): boolean {
  return IMAGE_EXTENSIONS.includes(getExtension(filename))
}

function isTextFile(filename: string): boolean {
  return TEXT_EXTENSIONS.includes(getExtension(filename))
}

function getBaseName(filename: string): string {
  const parts = filename.split('.')
  parts.pop()
  return parts.join('.')
}

export async function parseFlashcardsFromZip(file: File): Promise<ParsedFlashcard[]> {
  const zip = await JSZip.loadAsync(file)
  const flashcards: ParsedFlashcard[] = []

  // Group files by folder
  const folders = new Map<string, JSZip.JSZipObject[]>()

  zip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return

    const parts = relativePath.split('/')
    if (parts.length >= 2) {
      const folderPath = parts.slice(0, -1).join('/')
      const existing = folders.get(folderPath) || []
      existing.push(zipEntry)
      folders.set(folderPath, existing)
    }
  })

  for (const [, files] of folders) {
    let mainImage: Blob | null = null
    const languages: { [iso3Code: string]: string | Blob } = {}

    for (const zipEntry of files) {
      const filename = zipEntry.name.split('/').pop() || ''
      const baseName = getBaseName(filename)

      if (filename.startsWith('image.') && isImageFile(filename)) {
        mainImage = await zipEntry.async('blob')
      } else if (isImageFile(filename)) {
        languages[baseName] = await zipEntry.async('blob')
      } else if (isTextFile(filename)) {
        const text = await zipEntry.async('string')
        languages[baseName] = text.trim()
      }
    }

    if (mainImage && Object.keys(languages).length > 0) {
      flashcards.push({ image: mainImage, languages })
    }
  }

  return flashcards
}

export async function loadFlashcardsFromPublicData(): Promise<ParsedFlashcard[]> {
  const flashcards: ParsedFlashcard[] = []

  try {
    // Load folder list
    const foldersResponse = await fetch('/data/manifest.json')
    if (!foldersResponse.ok) return flashcards

    const folders: string[] = await foldersResponse.json()

    for (const folder of folders) {
      try {
        // Load per-folder manifest
        const manifestResponse = await fetch(`/data/${folder}/manifest.json`)
        if (!manifestResponse.ok) continue

        const files: string[] = await manifestResponse.json()

        let mainImage: Blob | null = null
        const languages: { [iso3Code: string]: string | Blob } = {}

        for (const filename of files) {
          const baseName = getBaseName(filename)

          if (filename.startsWith('image.') && isImageFile(filename)) {
            const response = await fetch(`/data/${folder}/${filename}`)
            if (response.ok) {
              mainImage = await response.blob()
            }
          } else if (isImageFile(filename)) {
            const response = await fetch(`/data/${folder}/${filename}`)
            if (response.ok) {
              languages[baseName] = await response.blob()
            }
          } else if (isTextFile(filename)) {
            const response = await fetch(`/data/${folder}/${filename}`)
            if (response.ok) {
              languages[baseName] = await response.text()
            }
          }
        }

        if (mainImage && Object.keys(languages).length > 0) {
          flashcards.push({ image: mainImage, languages })
        }
      } catch {
        // Folder processing failed
      }
    }
  } catch {
    // Manifest loading failed
  }

  return flashcards
}
