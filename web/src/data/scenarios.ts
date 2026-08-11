import type { MockScenario } from '../types'

export const scenarios: MockScenario[] = [
  {
    id: 'semantic-memory',
    eyebrow: 'Semantic memory',
    title: 'Search your knowledge base',
    description: 'See how stored evidence becomes a grounded research answer.',
    prompt: 'How does semantic search improve research quality?',
    answer: `## Semantic search improves research in three ways

It retrieves information by **meaning**, not only by exact keyword overlap. That makes it especially useful when the question and the source use different vocabulary.

1. **Higher recall** — conceptually related passages remain discoverable.
2. **Better context selection** — only the most relevant chunks enter the model context.
3. **Traceable answers** — each claim can point back to a stored source.

The strongest results come from matching the query embedding model to the one used for the stored document vectors, then combining similarity scores with sensible source diversity limits.`,
    sources: [
      {
        kind: 'memory',
        source: 'research-notes/vector-retrieval',
        title: 'Vector retrieval design notes',
        chunkId: 'chunk-018',
      },
      {
        kind: 'memory',
        source: 'engineering/grounded-generation',
        title: 'Grounded generation patterns',
        chunkId: 'chunk-042',
      },
    ],
    status: 'complete',
  },
  {
    id: 'hybrid-research',
    eyebrow: 'Memory + web',
    title: 'Combine stable and current context',
    description: 'Blend internal knowledge with recent public sources.',
    prompt: 'Compare vector search and web search for current research.',
    answer: `## Vector search and web search solve different parts of research

**Vector search** is strongest when the relevant corpus is curated, private, or stable. It offers predictable scope, rich metadata, and repeatable retrieval.

**Web search** is strongest when recency and breadth matter. It can discover changes that have not yet entered the semantic memory, but source quality varies more widely.

### Practical recommendation

Use semantic memory as the grounding layer, then use web search to close freshness gaps. The agent should preserve the origin of every passage so the final answer can distinguish stored evidence from live sources.`,
    sources: [
      {
        kind: 'memory',
        source: 'architecture/retrieval-strategy',
        title: 'Retrieval strategy handbook',
        chunkId: 'chunk-011',
      },
      {
        kind: 'web',
        source: 'qdrant.tech',
        title: 'Qdrant documentation',
        url: 'https://qdrant.tech/documentation/',
      },
      {
        kind: 'web',
        source: 'langchain.com',
        title: 'LangChain retrieval documentation',
        url: 'https://docs.langchain.com/',
      },
    ],
    status: 'complete',
  },
  {
    id: 'partial-research',
    eyebrow: 'Graceful degradation',
    title: 'Continue when a source is unavailable',
    description: 'Preview an evidence-limited result and recovery controls.',
    prompt: 'Summarize recent advances in retrieval systems.',
    answer: `## Evidence-limited summary

The available semantic memory points to three recurring improvements: more deliberate query planning, source-aware reranking, and tighter evaluation of whether retrieved passages actually support the final claims.

The live web source was unavailable for this run, so this answer cannot verify the most recent releases or announcements. Retry when web research is available for a current comparison.`,
    sources: [
      {
        kind: 'memory',
        source: 'research/retrieval-evaluation',
        title: 'Evaluating retrieval quality',
        chunkId: 'chunk-031',
      },
    ],
    status: 'partial',
    unavailableStage: 'web',
  },
]

export const failurePrompt = 'Trigger the mock research error.'

export const genericScenario: MockScenario = {
  id: 'generic-research',
  eyebrow: 'Open research',
  title: 'Explore a question',
  description: 'A generic mocked response for free-form prompts.',
  prompt: '',
  answer: `## Research brief

The mock research workflow reviewed semantic memory and a small set of public sources. The evidence suggests that a useful answer should separate stable background knowledge from time-sensitive findings, preserve source metadata, and state uncertainty when evidence is incomplete.

This is a **local demonstration response**. No request was sent to the DeepContext API.`,
  sources: [
    {
      kind: 'memory',
      source: 'demo/semantic-memory',
      title: 'Mock semantic memory',
      chunkId: 'demo-001',
    },
    {
      kind: 'web',
      source: 'example.com',
      title: 'Mock public reference',
      url: 'https://example.com',
    },
  ],
  status: 'complete',
}

export function findScenario(prompt: string): MockScenario {
  const normalized = prompt.trim().toLocaleLowerCase()
  if (normalized === failurePrompt.toLocaleLowerCase()) {
    return { ...genericScenario, id: 'failed-research', prompt, shouldFail: true }
  }
  return scenarios.find((item) => item.prompt.toLocaleLowerCase() === normalized) ?? {
    ...genericScenario,
    prompt,
  }
}

