import type { KinshipRepository } from "../domain.js";

export type RetrievedEvidence = {
  title: string;
  content: string;
  sourceId: string;
  sourceType: "memory" | "event" | "file" | "person";
  sourceUrl: string;
  detail: string;
  score: number;
};

export class RetrievalService {
  constructor(private readonly repository: KinshipRepository) {}

  async retrieve(userId: string, familyId: string, question: string, limit = 8) {
    const [chunks, memories, events, files, members] = await Promise.all([
      this.repository.listSourceChunks(familyId, 100),
      this.repository.listMemoryAlbums(userId, familyId),
      this.repository.listFamilyEvents(userId, familyId),
      this.repository.listFamilyFiles(userId, familyId),
      this.repository.listFamilyMembers(userId, familyId),
    ]);
    const candidates: Omit<RetrievedEvidence, "score">[] = [
      ...chunks.map((chunk) => ({ title: chunk.title, content: chunk.content, sourceId: chunk.sourceId, sourceType: chunk.sourceType, sourceUrl: chunk.sourceUrl, detail: chunk.detail })),
      ...memories.map((memory) => ({ title: memory.title, content: `${memory.description}\nMemory date: ${memory.memoryDate}. Contains ${memory.photos.length} photo${memory.photos.length === 1 ? "" : "s"}.`, sourceId: memory.id, sourceType: "memory" as const, sourceUrl: memory.photos[0] ?? "", detail: memory.memoryDate })),
      ...events.map((event) => ({ title: event.title, content: `${event.description}\n${event.category} on ${event.eventDate}${event.location ? ` at ${event.location}` : ""}.`, sourceId: event.id, sourceType: "event" as const, sourceUrl: event.imageUrl, detail: event.eventDate })),
      ...files.map((file) => ({ title: file.name, content: `${file.description}\nFile type: ${file.fileType}. Uploaded by ${file.uploaderName}.`, sourceId: file.id, sourceType: "file" as const, sourceUrl: file.url, detail: file.fileType })),
      ...members.map((member) => ({ title: member.name, content: `${member.name} is a family member. Relationship to the current user: ${member.relationship || "not specified"}. Role: ${member.role}. Birthday: ${member.birthday || "not recorded"}.`, sourceId: member.id, sourceType: "person" as const, sourceUrl: "", detail: member.relationship || member.role })),
    ];
    const terms = tokenize(question);
    const unique = [...new Map(candidates.map((candidate) => [`${candidate.sourceType}:${candidate.sourceId}`, candidate])).values()];
    return unique
      .map((evidence) => ({ ...evidence, score: scoreEvidence(evidence, terms) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }
}

function scoreEvidence(evidence: Omit<RetrievedEvidence, "score">, terms: string[]) {
  const title = tokenize(evidence.title);
  const content = new Set(tokenize(`${evidence.content} ${evidence.detail} ${evidence.sourceType}`));
  return terms.reduce((score, term) => score + (title.includes(term) ? 3 : 0) + (content.has(term) ? 1 : 0), 0);
}

function tokenize(value: string) {
  return value.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2);
}
