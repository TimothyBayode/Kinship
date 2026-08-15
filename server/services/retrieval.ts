import type { KinshipRepository, SourceChunk } from "../domain.js";

export class RetrievalService {
  constructor(private readonly repository: KinshipRepository) {}

  async retrieve(familyId: string, question: string, limit = 6) {
    const candidates = await this.repository.listSourceChunks(familyId, 100);
    const terms = tokenize(question);
    return candidates
      .map((chunk) => ({ chunk, score: scoreChunk(chunk, terms) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || b.chunk.createdAt.localeCompare(a.chunk.createdAt))
      .slice(0, limit)
      .map(({ chunk }) => ({ title: chunk.title, content: chunk.content, sourceId: chunk.sourceId }));
  }
}

function scoreChunk(chunk: SourceChunk, terms: string[]) {
  const title = tokenize(chunk.title);
  const content = new Set(tokenize(chunk.content));
  return terms.reduce((score, term) => score + (title.includes(term) ? 3 : 0) + (content.has(term) ? 1 : 0), 0);
}

function tokenize(value: string) {
  return value.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2);
}
