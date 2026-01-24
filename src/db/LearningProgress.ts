import type { Card } from "ts-fsrs"

export interface LearningProgress extends Card {
  id: string
  isDisabled?: boolean
  isArchived?: boolean
}
