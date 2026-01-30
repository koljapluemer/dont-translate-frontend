import Dexie, { type EntityTable } from 'dexie'
import type { FlashCard } from './Flashcard'
import type { LearningProgress } from './LearningProgress'

class Database extends Dexie {
  declare flashcards: EntityTable<FlashCard, 'id'>
  declare learningProgress: EntityTable<LearningProgress, 'id'>

  constructor() {
    super('dont-translate')

    this.version(1).stores({
      flashcards: 'id',
      learningProgress: 'id, due'
    })

    this.version(2).stores({
      flashcards: 'id, language',
      learningProgress: 'id, due'
    })
  }
}

export const db = new Database()
