import { GoogleGenAI } from "@google/genai";
import type { AppConfig } from "../config.js";

export type RetrievedContext = { title: string; content: string; sourceId: string; sourceType: "memory" | "event" | "file" | "person"; sourceUrl: string; detail: string; score: number };

export class AiService {
  private readonly client: GoogleGenAI | null;
  constructor(private readonly config: AppConfig) {
    this.client = config.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: config.GEMINI_API_KEY }) : null;
  }

  async generate(input: { question: string; familyName: string; context: RetrievedContext[]; history?: Array<{ role: "user" | "assistant"; content: string }> }) {
    if (/^(hi|hello|hey|good morning|good afternoon|good evening|good day)\b/i.test(input.question.trim())) {
      return { content: "Hello. I’m Kinship, your family archive assistant. I can help you explore the people, memories, files, events, and relationships preserved in your family archive. Ask me about a person, place, story, or date.", sources: [] };
    }
    if (/what can you do|how can you help|who are you/i.test(input.question)) {
      return { content: "I can search your family archive, connect people to memories and events, find details in uploaded files, and explain relationships using the evidence preserved in Kinship. I’ll tell you when the archive does not contain enough information.", sources: [] };
    }
    if (!this.client) {
      if (this.config.NODE_ENV === "production") throw new Error("GEMINI_API_KEY is required in production");
      return {
        content: "Gemini is not configured yet. The retrieval boundary is ready and will answer from the selected family records after an API key is added.",
        sources: input.context,
      };
    }
    if (input.context.length === 0) return { content: "I couldn't find enough evidence in this family archive to answer that yet.", sources: [] };
    const evidence = input.context.map((item, index) => `[${index + 1}] ${item.title} (${item.sourceType})\n${item.content}`).join("\n\n");
    const response = await this.client.models.generateContent({
      model: this.config.GEMINI_MODEL,
      contents: `Family: ${input.familyName}\n\nRecent conversation:\n${input.history?.slice(-8).map((item) => `${item.role}: ${item.content}`).join("\n") || "No prior messages."}\n\nPreserved family evidence:\n${evidence || "No matching preserved evidence was found."}\n\nQuestion: ${input.question}`,
      config: {
        systemInstruction: "You are Kinship, a careful family archive assistant. Answer only from the supplied family evidence. If evidence is insufficient or does not answer the question, explicitly say the family archive does not contain enough information. Never invent relatives, relationships, dates, sources, or events. Resolve relationships only from supplied person evidence. Use warm, concise prose and cite factual claims using [1], [2], etc.",
        temperature: 0.2,
      },
    });
    return { content: response.text ?? "The family archive did not return an answer.", sources: input.context };
  }
}
