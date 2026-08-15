export type AskSource = {
  id: string;
  title: string;
  detail: string;
  type: "document" | "audio" | "photo";
  excerpt: string;
};

export type AskMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  sources?: AskSource[];
  error?: boolean;
};

export type AskConversation = {
  id: string;
  title: string;
  dateGroup: "Today" | "Yesterday" | "Previous 7 Days" | "Older";
  updatedAt: string;
  context: string;
  messages: AskMessage[];
};

const STORAGE_KEY = "kinship.ask-conversations";

const sources: Record<string, AskSource[]> = {
  joe: [
    { id: "s1", title: "Joe's letter", detail: "1944", type: "document", excerpt: "A letter Joe sent home from France in November 1944. He writes about missing Sunday dinner and keeping a small photograph of Grace in his jacket." },
    { id: "s2", title: "Grace's interview", detail: "1998", type: "audio", excerpt: "Grace remembers Joe as quiet, loyal, and unexpectedly funny during difficult years." },
    { id: "s3", title: "Family photograph", detail: "1944", type: "photo", excerpt: "Joe with three friends shortly before leaving for Europe." },
  ],
  recipes: [
    { id: "s4", title: "Sunday recipe book", detail: "1962", type: "document", excerpt: "A handwritten notebook containing Grace's tomato sauce, lemon cake, and holiday stuffing." },
    { id: "s5", title: "Sarah's kitchen recording", detail: "2007", type: "audio", excerpt: "Sarah explains that Grace measured ingredients by hand and always doubled the garlic." },
  ],
  farm: [
    { id: "s6", title: "Farm deed", detail: "1931", type: "document", excerpt: "The original deed for the family's twelve-acre farm outside Ibadan." },
    { id: "s7", title: "Harvest photograph", detail: "1956", type: "photo", excerpt: "Three generations standing beside the western field after harvest." },
  ],
};

const seedConversations: AskConversation[] = [
  {
    id: "joe-war",
    title: "Joe's War Experience",
    dateGroup: "Today",
    updatedAt: "2026-08-15T11:30:00.000Z",
    context: 'Samuel "Joe" Adeyemi',
    messages: [
      { id: "m1", role: "user", content: "What was Grandpa Joe like during the war?", createdAt: "2026-08-15T11:29:00.000Z" },
      { id: "m2", role: "assistant", content: "Joe was 22 when he joined the army in 1943. His letters suggest he was steady and observant rather than fearless. He wrote often about ordinary family rituals, especially Sunday dinner, and used humor to reassure Grace when conditions were difficult.\n\nGrace later remembered that the war made him more protective of family time. After returning home, he rarely missed a gathering and kept every letter in a wooden box beneath their bed.", createdAt: "2026-08-15T11:30:00.000Z", sources: sources.joe },
    ],
  },
  {
    id: "grandma-childhood",
    title: "Grandma's Childhood",
    dateGroup: "Today",
    updatedAt: "2026-08-15T09:10:00.000Z",
    context: "Grandma Grace",
    messages: [
      { id: "m3", role: "user", content: "Where did Grandma Grace grow up?", createdAt: "2026-08-15T09:09:00.000Z" },
      { id: "m4", role: "assistant", content: "Grace grew up near the family farm with her parents and two sisters. Her recorded stories describe a busy home shaped by school, church, and harvest seasons.", createdAt: "2026-08-15T09:10:00.000Z", sources: sources.farm },
    ],
  },
  {
    id: "family-recipes",
    title: "Family Recipes",
    dateGroup: "Yesterday",
    updatedAt: "2026-08-14T16:00:00.000Z",
    context: "Entire Bayode Family",
    messages: [
      { id: "m5", role: "user", content: "Which recipes did Grandma Grace preserve?", createdAt: "2026-08-14T15:59:00.000Z" },
      { id: "m6", role: "assistant", content: "The archive contains three recipes directly attributed to Grace: her Sunday tomato sauce, lemon cake, and handwritten holiday stuffing. Sarah's recording adds useful details that are missing from the written measurements.", createdAt: "2026-08-14T16:00:00.000Z", sources: sources.recipes },
    ],
  },
  { id: "family-farm", title: "The Family Farm", dateGroup: "Yesterday", updatedAt: "2026-08-14T10:00:00.000Z", context: "Entire Bayode Family", messages: [{ id: "m7", role: "user", content: "Tell me about the family farm.", createdAt: "2026-08-14T09:59:00.000Z" }, { id: "m8", role: "assistant", content: "The farm entered the family in 1931 and became both a livelihood and gathering place. Photographs show three generations working the western field together.", createdAt: "2026-08-14T10:00:00.000Z", sources: sources.farm }] },
  { id: "who-samuel", title: "Who Was Samuel?", dateGroup: "Previous 7 Days", updatedAt: "2026-08-11T12:00:00.000Z", context: "Entire Bayode Family", messages: [] },
  { id: "origins", title: "Our Family Origins", dateGroup: "Older", updatedAt: "2026-07-20T12:00:00.000Z", context: "Entire Bayode Family", messages: [] },
];

function cloneSeed() {
  return structuredClone(seedConversations);
}

function readConversations(): AskConversation[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : cloneSeed();
  } catch {
    return cloneSeed();
  }
}

function writeConversations(conversations: AskConversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  return conversations;
}

export const conversationService = {
  async list() {
    return readConversations();
  },
  async get(id: string) {
    return readConversations().find((conversation) => conversation.id === id) ?? null;
  },
  async create() {
    const conversation: AskConversation = { id: crypto.randomUUID(), title: "New conversation", dateGroup: "Today", updatedAt: new Date().toISOString(), context: "Entire Bayode Family", messages: [] };
    writeConversations([conversation, ...readConversations()]);
    return conversation;
  },
  async update(conversation: AskConversation) {
    const conversations = readConversations();
    const next = conversations.some((item) => item.id === conversation.id)
      ? conversations.map((item) => item.id === conversation.id ? conversation : item)
      : [conversation, ...conversations];
    writeConversations(next);
    return conversation;
  },
  async rename(id: string, title: string) {
    const conversations = readConversations().map((conversation) => conversation.id === id ? { ...conversation, title } : conversation);
    writeConversations(conversations);
    return conversations;
  },
  async delete(id: string) {
    const conversations = readConversations().filter((conversation) => conversation.id !== id);
    writeConversations(conversations);
    return conversations;
  },
};

export const aiService = {
  async generateResponse({ message, context }: { conversationId: string; familyId: string; message: string; context: string }) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    if (message.toLowerCase().includes("error")) throw new Error("Mock request failed");
    const topic = message.toLowerCase();
    const selectedSources = topic.includes("recipe") ? sources.recipes : topic.includes("farm") ? sources.farm : sources.joe;
    return {
      content: context === "Entire Bayode Family"
        ? "I found several connected records in the family archive. Together, they show how this story was remembered by different relatives over time. The written material gives the dates and places, while the recordings preserve the details people recalled later."
        : `I searched the archive with ${context} as the focus. The strongest records are a preserved document and an oral-history recording, which agree on the main events while adding different personal details.`,
      sources: selectedSources,
      context,
      createdAt: new Date().toISOString(),
    };
  },
};
