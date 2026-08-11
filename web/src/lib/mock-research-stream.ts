import { findScenario } from '../data/scenarios'
import type { ActivityStage, ResearchEvent } from '../types'

const wait = (milliseconds: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, milliseconds)
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer)
        reject(new DOMException('Research cancelled', 'AbortError'))
      },
      { once: true },
    )
  })

const tokens = (content: string) => content.match(/\S+\s*/g) ?? []

export async function* mockResearchStream(
  prompt: string,
  signal: AbortSignal,
): AsyncGenerator<ResearchEvent> {
  const scenario = findScenario(prompt)
  const threadId = crypto.randomUUID()
  yield { type: 'metadata', threadId }

  const stages: ActivityStage[] = ['planning', 'memory', 'web', 'synthesis']
  for (const stage of stages) {
    if (scenario.shouldFail && stage === 'memory') {
      await wait(500, signal)
      yield {
        type: 'error',
        code: 'mock_research_failed',
        message: 'The mocked research run stopped before evidence could be collected.',
      }
      return
    }

    yield { type: 'activity', stage, state: 'active' }
    await wait(stage === 'planning' ? 420 : 580, signal)
    yield {
      type: 'activity',
      stage,
      state: scenario.unavailableStage === stage ? 'unavailable' : 'complete',
    }
  }

  for (const token of tokens(scenario.answer)) {
    await wait(18 + Math.random() * 18, signal)
    yield { type: 'token', content: token }
  }

  yield {
    type: 'result',
    answer: scenario.answer,
    sources: scenario.sources,
    status: scenario.status,
  }
}

