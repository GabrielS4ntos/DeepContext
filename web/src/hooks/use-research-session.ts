import { useCallback, useEffect, useRef, useState } from 'react'
import { mockResearchStream } from '../lib/mock-research-stream'
import type {
  Activity,
  ActivityStage,
  AssistantTurn,
  ConversationTurn,
  TurnState,
} from '../types'

const initialActivity = (): Activity[] =>
  (['planning', 'memory', 'web', 'synthesis'] as ActivityStage[]).map((stage) => ({
    stage,
    state: 'waiting',
  }))

const id = () => crypto.randomUUID()

export function useResearchSession() {
  const [turns, setTurns] = useState<ConversationTurn[]>([])
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const generationRef = useRef(0)

  const patchAssistant = useCallback(
    (turnId: string, patch: Partial<AssistantTurn>, generation: number) => {
      if (generation !== generationRef.current) return
      setTurns((current) =>
        current.map((turn) =>
          turn.id === turnId && turn.role === 'assistant' ? { ...turn, ...patch } : turn,
        ),
      )
    },
    [],
  )

  const abortActive = useCallback((state?: TurnState) => {
    generationRef.current += 1
    controllerRef.current?.abort()
    controllerRef.current = null
    setActiveTurnId((currentId) => {
      if (currentId && state) {
        setTurns((current) =>
          current.map((turn) =>
            turn.id === currentId && turn.role === 'assistant'
              ? { ...turn, state }
              : turn,
          ),
        )
      }
      return null
    })
  }, [])

  const run = useCallback(
    async (question: string, options?: { retry?: boolean }) => {
      const trimmed = question.trim()
      if (!trimmed) return

      abortActive('cancelled')
      const generation = generationRef.current
      const assistantId = id()
      const assistant: AssistantTurn = {
        id: assistantId,
        role: 'assistant',
        content: '',
        state: 'streaming',
        sources: [],
        activity: initialActivity(),
        question: trimmed,
        retried: options?.retry,
      }
      setTurns((current) => [
        ...current,
        ...(options?.retry
          ? []
          : [{ id: id(), role: 'user' as const, content: trimmed }]),
        assistant,
      ])
      setActiveTurnId(assistantId)

      const controller = new AbortController()
      controllerRef.current = controller

      try {
        for await (const event of mockResearchStream(trimmed, controller.signal)) {
          if (generation !== generationRef.current) return
          if (event.type === 'activity') {
            setTurns((current) =>
              current.map((turn) =>
                turn.id === assistantId && turn.role === 'assistant'
                  ? {
                      ...turn,
                      activity: turn.activity.map((item) =>
                        item.stage === event.stage
                          ? { ...item, state: event.state }
                          : item,
                      ),
                    }
                  : turn,
              ),
            )
          }
          if (event.type === 'token') {
            setTurns((current) =>
              current.map((turn) =>
                turn.id === assistantId && turn.role === 'assistant'
                  ? { ...turn, content: turn.content + event.content }
                  : turn,
              ),
            )
          }
          if (event.type === 'result') {
            patchAssistant(
              assistantId,
              { content: event.answer, sources: event.sources, state: event.status },
              generation,
            )
          }
          if (event.type === 'error') {
            patchAssistant(
              assistantId,
              { state: 'failed', error: event.message },
              generation,
            )
          }
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          patchAssistant(
            assistantId,
            { state: 'failed', error: 'The mock research session could not finish.' },
            generation,
          )
        }
      } finally {
        if (generation === generationRef.current) {
          controllerRef.current = null
          setActiveTurnId(null)
        }
      }
    },
    [abortActive, patchAssistant],
  )

  const clear = useCallback(() => {
    abortActive()
    setTurns([])
  }, [abortActive])

  const cancel = useCallback(() => abortActive('cancelled'), [abortActive])
  const retry = useCallback((question: string) => run(question, { retry: true }), [run])

  useEffect(() => () => abortActive(), [abortActive])

  return {
    turns,
    isResearching: activeTurnId !== null,
    submit: run,
    cancel,
    clear,
    retry,
  }
}

