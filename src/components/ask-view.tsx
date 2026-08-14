import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { Button, SectionTitle } from "@/components/kinship-ui";
import { chatService, conversations, type Message } from "@/lib/types";

export function AskView() {
  const [messages, setMessages] = useState<Message[]>(
    conversations[0].messages,
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput("");
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: question },
    ]);
    setLoading(true);
    const answer = await chatService.ask(question);
    setMessages((current) => [...current, answer]);
    setLoading(false);
  };

  return (
    <section className="mx-auto max-w-4xl">
      <SectionTitle title="Ask Kinship" eyebrow="Your private archive">
        <span className="rounded-full bg-secondary px-4 py-2 text-xs font-medium text-secondary-foreground">
          Private conversation
        </span>
      </SectionTitle>
      <div className="surface mt-8 overflow-hidden rounded-3xl">
        <div className="flex min-h-[480px] flex-col gap-6 p-5 sm:p-8">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                {message.content}
                {message.source && (
                  <p className="mt-3 border-t border-current/15 pt-2 text-xs opacity-70">
                    {message.source}
                  </p>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-sm text-muted-foreground">
              Searching your archive...
            </div>
          )}
          <div className="mt-auto flex items-center gap-2 rounded-2xl border bg-card p-2">
            <input
              aria-label="Ask Kinship a question"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.nativeEvent.isComposing &&
                  event.keyCode !== 229
                )
                  ask();
              }}
              placeholder="Ask about your family memories..."
              className="min-w-0 flex-1 bg-transparent px-3 py-2 outline-none"
            />
            <Button primary onClick={ask}>
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
