export interface FlashCard {
  id: string
  image: Blob
  language: string // 3-letter ISO code
  expressions: (string | Blob)[] // multiple meaning options
  collection: string
  credits?: string
}
