import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  FileText,
  History,
  Image,
  Mic,
  MoreHorizontal,
  Paperclip,
  PanelRightClose,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserRound,
  Volume2,
  X,
} from "lucide-react";

import {
  aiService,
  conversationService,
  type AskConversation,
  type AskMessage,
  type AskSource,
} from "@/lib/ask-kinship";

const suggestions = [
  { label: "Grandpa Joe", question: "What was Grandpa Joe like during the war?", icon: UserRound },
  { label: "Grandma Grace", question: "What do we know about Grandma Grace's childhood?", icon: UserRound },
  { label: "Family recipes", question: "Which family recipes have been preserved?", icon: FileText },
];

export function AskView() {
  const [conversations, setConversations] = useState<AskConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failedQuestion, setFailedQuestion] = useState("");
  const [source, setSource] = useState<AskSource | null>(null);
  const activeConversation = conversations.find((conversation) => conversation.id === activeId) ?? null;

  useEffect(() => {
    conversationService.list().then(setConversations);
  }, []);

  const startNew = () => {
    setActiveId(null);
    setFailedQuestion("");
    setMobileHistoryOpen(false);
  };

  const send = async (question: string) => {
    if (!question.trim() || loading) return;
    const now = new Date().toISOString();
    let conversation = activeConversation;
    if (!conversation) {
      conversation = {
        id: crypto.randomUUID(),
        title: question.trim().split(/\s+/).slice(0, 5).join(" "),
        dateGroup: "Today",
        updatedAt: now,
        context: "Entire Bayode Family",
        messages: [],
      };
    }
    const userMessage: AskMessage = { id: crypto.randomUUID(), role: "user", content: question.trim(), createdAt: now };
    const pending = { ...conversation, updatedAt: now, messages: [...conversation.messages, userMessage] };
    setActiveId(pending.id);
    setConversations((current) => [pending, ...current.filter((item) => item.id !== pending.id)]);
    setLoading(true);
    setFailedQuestion("");

    try {
      const response = await aiService.generateResponse({ conversationId: pending.id, familyId: "bayode-family", message: question, context: pending.context });
      const complete: AskConversation = {
        ...pending,
        updatedAt: response.createdAt,
        messages: [...pending.messages, { id: crypto.randomUUID(), role: "assistant", content: response.content, sources: response.sources, createdAt: response.createdAt }],
      };
      setConversations((current) => [complete, ...current.filter((item) => item.id !== complete.id)]);
      await conversationService.update(complete);
    } catch {
      const failed: AskConversation = {
        ...pending,
        messages: [...pending.messages, { id: crypto.randomUUID(), role: "assistant", content: "Kinship couldn't answer that right now. Please try again.", createdAt: new Date().toISOString(), error: true }],
      };
      setFailedQuestion(question);
      setConversations((current) => [failed, ...current.filter((item) => item.id !== failed.id)]);
    } finally {
      setLoading(false);
    }
  };

  const removeContext = async () => {
    if (!activeConversation) return;
    const updated = { ...activeConversation, context: "Entire Bayode Family" };
    setConversations((current) => current.map((item) => item.id === updated.id ? updated : item));
    await conversationService.update(updated);
  };

  return (
    <div className="flex h-[calc(133.333vh-80px)] min-h-[680px] overflow-hidden bg-[#f5f5f2] text-[#242424]">
      <main className="relative flex min-w-0 flex-1 flex-col bg-[#f5f5f2]">
        <div className="flex min-h-16 items-center justify-between px-5 py-3 sm:px-8 lg:px-10">
          <div className="min-w-0">
            {activeConversation && <ContextBadge context={activeConversation.context} onRemove={removeContext} />}
          </div>
          <div className="flex items-center gap-2">
            {!historyOpen && (
              <button type="button" className="surface hidden size-10 cursor-w-resize place-items-center rounded-md text-primary hover:bg-[#f2f5ef] lg:grid" onClick={() => setHistoryOpen(true)} aria-label="Expand chat history" title="Expand chat history">
                <History className="size-5" />
              </button>
            )}
            <button type="button" className="rounded-md p-2 text-primary hover:bg-[#f2f5ef] lg:hidden" onClick={() => setMobileHistoryOpen(true)} aria-label="Open chat history">
              <History className="size-5" />
            </button>
          </div>
        </div>

        {activeConversation ? (
          <ConversationView conversation={activeConversation} loading={loading} failedQuestion={failedQuestion} onRetry={send} onSource={setSource} onSend={send} />
        ) : (
          <AskKinshipEmptyState onSuggestion={send} onSend={send} loading={loading} />
        )}
      </main>

      <div className={`hidden shrink-0 overflow-hidden rounded-tl-xl bg-white transition-[width] duration-200 lg:block ${historyOpen ? "w-[28%] min-w-[330px] max-w-[430px]" : "w-0"}`}>
        <ChatHistory conversations={conversations} activeId={activeId} onSelect={setActiveId} onNew={startNew} onClose={() => setHistoryOpen(false)} onChange={setConversations} />
      </div>

      {mobileHistoryOpen && (
        <div className="fixed inset-0 z-50 bg-foreground/15 backdrop-blur-sm lg:hidden" onClick={() => setMobileHistoryOpen(false)}>
          <div className="ml-auto h-full w-[min(88vw,380px)] rounded-tl-xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
            <ChatHistory conversations={conversations} activeId={activeId} onSelect={(id) => { setActiveId(id); setMobileHistoryOpen(false); }} onNew={startNew} onClose={() => setMobileHistoryOpen(false)} onChange={setConversations} />
          </div>
        </div>
      )}

      {source && <SourcePreview source={source} onClose={() => setSource(null)} />}
    </div>
  );
}

function AskKinshipEmptyState({ onSuggestion, onSend, loading }: { onSuggestion: (question: string) => void; onSend: (question: string) => void; loading: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-8 sm:px-8">
      <div className="m-auto w-full max-w-[860px] py-10 text-center">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-bold leading-none sm:text-4xl">Ask</span>
          <img src="/logo.svg" alt="Kinship" className="h-10 w-auto max-w-36 translate-y-[9px] object-contain sm:h-12 sm:translate-y-[11px]" />
        </div>
        <div className="mx-auto mt-9 max-w-[840px] text-left"><MessageComposer onSend={onSend} loading={loading} placeholder="Ask about people, stories, places, recipes, photographs, or moments in time." /></div>
        <div className="mt-7">
          <p className="text-sm font-semibold">Ask Kinship about...</p>
          <div className="mx-auto mt-4 flex max-w-xl flex-nowrap justify-center gap-3 overflow-x-auto pb-1">
            {suggestions.map(({ label, question, icon: Icon }, index) => (
              <button key={label} type="button" onClick={() => onSuggestion(question)} className={`surface shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-4 py-3 text-sm font-semibold hover:bg-[#f2f5ef] ${index === 2 ? "hidden sm:flex" : "flex"}`}>
                <Icon className="size-4 text-primary" />{label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConversationView({ conversation, loading, failedQuestion, onRetry, onSource, onSend }: { conversation: AskConversation; loading: boolean; failedQuestion: string; onRetry: (question: string) => void; onSource: (source: AskSource) => void; onSend: (question: string) => void }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [conversation.messages.length, loading]);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-[860px] space-y-10">
          {conversation.messages.map((message) => message.role === "user"
            ? <UserMessage key={message.id} message={message} />
            : <KinshipMessage key={message.id} message={message} onSource={onSource} onRetry={message.error && failedQuestion ? () => onRetry(failedQuestion) : undefined} />)}
          {loading && <TypingIndicator />}
          <div ref={endRef} />
        </div>
      </div>
      <div className="bg-[#f5f5f2] px-5 py-4 sm:px-8">
        <div className="mx-auto max-w-[900px]"><MessageComposer onSend={onSend} loading={loading} placeholder="Ask a follow-up..." /></div>
      </div>
    </div>
  );
}

function UserMessage({ message }: { message: AskMessage }) {
  return <article><p className="text-xs font-bold uppercase text-[#6b6b6b]">You</p><p className="mt-3 max-w-2xl text-[15px] leading-7">{message.content}</p></article>;
}

function KinshipMessage({ message, onSource, onRetry }: { message: AskMessage; onSource: (source: AskSource) => void; onRetry?: () => void }) {
  return (
    <article>
      <p className="flex items-center gap-2 text-xs font-bold uppercase text-primary"><Sparkles className="size-3.5" />Kinship</p>
      <div className="mt-3 space-y-4 text-[15px] leading-7">{message.content.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
      {message.sources?.length ? <div className="mt-6"><p className="text-xs font-bold uppercase text-[#6b6b6b]">Sources</p><div className="mt-3 flex flex-wrap gap-2">{message.sources.map((source) => <SourceCard key={source.id} source={source} onClick={() => onSource(source)} />)}</div></div> : null}
      {onRetry && <button type="button" onClick={onRetry} className="mt-4 rounded-md bg-[#f2f5ef] px-4 py-2 text-sm font-bold text-primary hover:bg-primary/15">Try again</button>}
    </article>
  );
}

function SourceCard({ source, onClick }: { source: AskSource; onClick: () => void }) {
  const Icon = source.type === "audio" ? Volume2 : source.type === "photo" ? Image : FileText;
  return <button type="button" onClick={onClick} className="flex items-center gap-2 rounded-md border border-[#eaeaea] px-3 py-2 text-left text-sm hover:border-primary/25 hover:bg-[#f2f5ef]"><Icon className="size-4 text-primary" /><span className="font-semibold">{source.title}</span><span className="text-[#6b6b6b]">· {source.detail}</span></button>;
}

function ContextBadge({ context, onRemove }: { context: string; onRemove: () => void }) {
  const removable = context !== "Entire Bayode Family";
  return <div className="mt-1 flex items-center gap-2 text-xs text-[#6b6b6b]"><span>Context:</span><span className="flex items-center gap-1 rounded-md bg-[#f2f5ef] px-2 py-1 font-semibold text-primary">{context}{removable && <button type="button" onClick={onRemove} aria-label="Remove person context"><X className="size-3" /></button>}</span></div>;
}

function MessageComposer({ onSend, loading, placeholder }: { onSend: (question: string) => void; loading: boolean; placeholder: string }) {
  const [value, setValue] = useState("");
  const [voiceState, setVoiceState] = useState<"idle" | "recording" | "processing">("idle");
  const [seconds, setSeconds] = useState(0);
  const canSend = value.trim().length > 0 && !loading && voiceState !== "processing";
  useEffect(() => {
    if (voiceState !== "recording") return;
    const timer = window.setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [voiceState]);
  const submit = () => { if (!canSend) return; onSend(value); setValue(""); };
  const toggleVoice = () => {
    if (voiceState === "idle") { setSeconds(0); setVoiceState("recording"); return; }
    if (voiceState === "recording") { setVoiceState("processing"); window.setTimeout(() => { setValue("Tell me about this family story."); setVoiceState("idle"); }, 900); }
  };
  return (
    <div className="surface rounded-xl p-4 transition-shadow focus-within:ring-2 focus-within:ring-primary/10">
      <textarea value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }} placeholder={placeholder} rows={3} className="max-h-40 min-h-20 w-full resize-none bg-transparent px-2 py-1 text-[15px] outline-none placeholder:text-[#858585]" />
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="rounded-md p-2 text-[#6b6b6b] hover:bg-[#f2f5ef] hover:text-primary" title="Attach a family file" aria-label="Attach a family file"><Paperclip className="size-5" /></button>
        <div className="flex items-center gap-2">
          {voiceState !== "idle" && <span className="text-xs font-semibold text-primary">{voiceState === "recording" ? `Recording 0:${String(seconds).padStart(2, "0")}` : "Transcribing..."}</span>}
          <VoiceButton state={voiceState} onClick={toggleVoice} />
          <button type="button" disabled={!canSend} onClick={submit} className="grid size-10 place-items-center rounded-md bg-primary text-white hover:brightness-105 disabled:bg-[#d5d5d5]" aria-label="Send message"><ArrowUp className="size-5" /></button>
        </div>
      </div>
    </div>
  );
}

function VoiceButton({ state, onClick }: { state: "idle" | "recording" | "processing"; onClick: () => void }) {
  return <button type="button" disabled={state === "processing"} onClick={onClick} className={`grid size-10 place-items-center rounded-md ${state === "recording" ? "bg-primary text-white" : "text-[#6b6b6b] hover:bg-[#f2f5ef] hover:text-primary"}`} aria-label={state === "recording" ? "Stop recording" : "Start voice input"}><Mic className="size-5" /></button>;
}

function TypingIndicator() {
  return <div><p className="flex items-center gap-2 text-xs font-bold uppercase text-primary"><Sparkles className="size-3.5" />Kinship</p><div className="mt-3 flex items-center gap-1 text-sm text-[#6b6b6b]"><span>Thinking</span><span className="animate-pulse">...</span></div></div>;
}

function ChatHistory({ conversations, activeId, onSelect, onNew, onClose, onChange }: { conversations: AskConversation[]; activeId: string | null; onSelect: (id: string) => void; onNew: () => void; onClose: () => void; onChange: (conversations: AskConversation[]) => void }) {
  const [query, setQuery] = useState("");
  const filtered = conversations.filter((conversation) => conversation.title.toLowerCase().includes(query.toLowerCase()));
  const groups = ["Today", "Yesterday", "Previous 7 Days", "Older"] as const;
  return (
    <aside className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between px-5 pb-3 pt-5"><h2 className="text-lg font-bold">Chat history</h2><button type="button" onClick={onClose} className="grid size-10 cursor-e-resize place-items-center rounded-md bg-[#f5f5f2] text-primary hover:bg-[#f2f5ef]" aria-label="Collapse chat history" title="Collapse chat history"><PanelRightClose className="size-5" /></button></div>
      <div className="px-5"><button type="button" onClick={onNew} className="flex w-full items-center gap-2 rounded-md bg-[#f2f5ef] px-4 py-3 text-sm font-bold text-primary hover:bg-primary/15"><Plus className="size-4" />New conversation</button><label className="mt-3 flex items-center gap-2 rounded-md border border-[#eaeaea] px-3 py-2.5 text-[#6b6b6b]"><Search className="size-4" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label></div>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-3 pb-5">
        {filtered.length ? groups.map((group) => {
          const items = filtered.filter((conversation) => conversation.dateGroup === group);
          return items.length ? <section key={group} className="mt-5 first:mt-0"><h3 className="px-2 text-[11px] font-bold uppercase text-[#858585]">{group}</h3><div className="mt-2 space-y-1">{items.map((conversation) => <ChatHistoryItem key={conversation.id} conversation={conversation} active={conversation.id === activeId} onSelect={() => onSelect(conversation.id)} onChange={onChange} />)}</div></section> : null;
        }) : <div className="px-3 py-12 text-center"><p className="font-semibold">No conversations found</p><p className="mt-2 text-sm leading-6 text-[#6b6b6b]">Ask Kinship about your family's stories, people, or memories.</p></div>}
      </div>
    </aside>
  );
}

function ChatHistoryItem({ conversation, active, onSelect, onChange }: { conversation: AskConversation; active: boolean; onSelect: () => void; onChange: (conversations: AskConversation[]) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(conversation.title);
  const saveRename = async () => { const next = title.trim() || conversation.title; setTitle(next); setRenaming(false); setMenuOpen(false); onChange(await conversationService.rename(conversation.id, next)); };
  return (
    <div className={`group relative rounded-md ${active ? "bg-[#f2f5ef]" : "hover:bg-[#f7f8f6]"}`}>
      {renaming ? <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} onBlur={saveRename} onKeyDown={(event) => { if (event.key === "Enter") saveRename(); if (event.key === "Escape") setRenaming(false); }} className="w-full rounded-md bg-white px-3 py-3 pr-10 text-sm font-semibold outline-none ring-1 ring-primary/30" /> : <button type="button" onClick={onSelect} className={`w-full truncate px-3 py-3 pr-10 text-left text-sm font-semibold ${active ? "text-primary" : ""}`}>{conversation.title}</button>}
      {!renaming && <button type="button" onClick={() => setMenuOpen((open) => !open)} className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 opacity-70 hover:bg-white group-hover:opacity-100" aria-label={`Actions for ${conversation.title}`}><MoreHorizontal className="size-4" /></button>}
      {menuOpen && <div className="surface absolute right-2 top-10 z-20 w-32 rounded-lg p-1"><button type="button" onClick={() => { setRenaming(true); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[#f2f5ef]"><Pencil className="size-3.5" />Rename</button><button type="button" onClick={async () => onChange(await conversationService.delete(conversation.id))} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/5"><Trash2 className="size-3.5" />Delete</button></div>}
    </div>
  );
}

function SourcePreview({ source, onClose }: { source: AskSource; onClose: () => void }) {
  const Icon = source.type === "audio" ? Volume2 : source.type === "photo" ? Image : FileText;
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-foreground/15 p-4 backdrop-blur-sm" onClick={onClose}><div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true"><div className="flex items-start justify-between gap-4"><span className="grid size-11 place-items-center rounded-md bg-[#f2f5ef] text-primary"><Icon className="size-5" /></span><button type="button" onClick={onClose} className="rounded-md p-2 hover:bg-[#f2f5ef]" aria-label="Close source"><X className="size-5" /></button></div><h2 className="mt-5 text-xl font-bold">{source.title}</h2><p className="mt-1 text-sm text-[#6b6b6b]">{source.detail}</p><p className="mt-5 leading-7">{source.excerpt}</p></div></div>;
}
