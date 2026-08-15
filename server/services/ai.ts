import { GoogleGenAI } from "@google/genai";
import type { AppConfig } from "../config.js";

export type RetrievedContext = { title: string; content: string; sourceId: string };

export class AiService {
  private readonly client: GoogleGenAI | null;
  constructor(private readonly config: AppConfig) {
    this.client = config.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: config.GEMINI_API_KEY }) : null;
  }

  async generate(input: { question: string; familyName: string; context: RetrievedContext[] }) {
    if (!this.client) {
      if (this.config.NODE_ENV === "production") throw new Error("GEMINI_API_KEY is required in production");
      return {
        content: "Gemini is not configured yet. The retrieval boundary is ready and will answer from the selected family records after an API key is added.",
        sources: input.context,
      };
    }
    const evidence = input.context.map((item, index) => `[${index + 1}] ${item.title}\n${item.content}`).join("\n\n");
    const response = await this.client.models.generateContent({
      model: this.config.GEMINI_MODEL,
      contents: `Family: ${input.familyName}\n\nPreserved family evidence:\n${evidence || "No matching preserved evidence was found."}\n\nQuestion: ${input.question}`,
      config: {
        systemInstruction: "You are Kinship, a careful family archive assistant. Answer only from the supplied family evidence. Clearly say when the archive does not contain enough information. Never invent relatives, dates, sources, or events. Use warm, concise prose and cite evidence using [1], [2], etc.",
        temperature: 0.2,
      },
    });
    return { content: response.text ?? "The family archive did not return an answer.", sources: input.context };
  }
}
