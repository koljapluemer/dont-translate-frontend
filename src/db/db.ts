import Dexie, { type EntityTable } from 'dexie'
import type { LearningProgress } from './LearningProgress'

class Database extends Dexie {
  declare learningProgress: EntityTable<LearningProgress, 'id'>

  constructor() {
    super('dont-translate-v2')

    this.version(1).stores({
      flashcards: 'id',
      learningProgress: 'id, due'
    })

    this.version(2).stores({
      flashcards: 'id, language',
      learningProgress: 'id, due'
    })

    this.version(3).stores({
      flashcards: null,
      learningProgress: 'id, due'
    })
  }
}

export const db = new Database()
