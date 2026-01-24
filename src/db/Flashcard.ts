export interface FlashCard {
  id: string
  image: Blob
  languages: { [iso3Code: string]: string | Blob }
}
