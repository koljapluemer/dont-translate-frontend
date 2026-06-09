export interface FlashCard {
  id: string
  image: string // URL path
  language: string // 3-letter ISO code
  expressions: string[]
  credits?: string
}
