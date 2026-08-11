export type Source = {
  source: string
  title?: string
  url?: string
  chunkId?: string
  kind: 'memory' | 'web'
}

export type ActivityStage = 'planning' | 'memory' | 'web' | 'synthesis'
export type ActivityState = 'waiting' | 'active' | 'complete' | 'unavailable'
export type TurnState = 'streaming' | 'complete' | 'partial' | 'cancelled' | 'failed'

export type Activity = {
  stage: ActivityStage
  state: ActivityState
}

export type UserTurn = {
  id: string
  role: 'user'
  content: string
}

export type AssistantTurn = {
  id: string
  role: 'assistant'
  content: string
  state: TurnState
  sources: Source[]
  activity: Activity[]
  error?: string
  question: string
  retried?: boolean
}

export type ConversationTurn = UserTurn | AssistantTurn

export type ResearchEvent =
  | { type: 'metadata'; threadId: string }
  | { type: 'activity'; stage: ActivityStage; state: Exclude<ActivityState, 'waiting'> }
  | { type: 'token'; content: string }
  | { type: 'result'; answer: string; sources: Source[]; status: 'complete' | 'partial' }
  | { type: 'error'; code: string; message: string }

export type MockScenario = {
  id: string
  prompt: string
  eyebrow: string
  title: string
  description: string
  answer: string
  sources: Source[]
  status: 'complete' | 'partial'
  unavailableStage?: ActivityStage
  shouldFail?: boolean
}

