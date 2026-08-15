export type Member = { id: string; name: string; relation: string; image: string; generation: number; selected?: boolean; isInLaw?: boolean }
export type Memory = { id: string; title: string; year: string; uploadedAt: string; image: string; count: number }
export type Event = { id: string; title: string; date: string; meta: string; category: 'Birthday' | 'Gathering' | 'Anniversary'; month: string; day: string; location: string; attendees: number; image?: string }
export type FamilyFile = { id: string; name: string; type: 'PDF' | 'Audio' | 'Spreadsheet' | 'Document'; size: string; updated: string; author: string }
export type Activity = { id: string; type: string; title: string; author: string; time: string; images: string[] }
export type Message = { id: string; role: 'user' | 'assistant'; content: string; source?: string }
export type Conversation = { id: string; title: string; messages: Message[] }
export type User = { name: string; email: string; avatar: string }
export type Family = { name: string; members: Member[] }
export type UploadStage = 'idle' | 'uploading' | 'processing' | 'transcribing' | 'extracting' | 'complete'

export const imageRefs = {
  landing: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/landing-page-6UKnx3GovyMtBe2KFpV7dCCL8MH93u.jpg',
  overview: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/overview-j7O0bbWDhsGbiIOUdaPjsVGu0LAK3w.png',
  family: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/family-folt4epfsRIsmLJUiTh52dMBDWtOoc.png',
  memories: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/memories.png-pilyQY0iQNdAwS8S4Aapgf5UVF0xk0.jpeg',
  auth: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=85',
}

export const user: User = { name: 'Timothy Bayode', email: 'timothybayode76@gmail.com', avatar: 'https://i.pravatar.cc/100?img=12' }
const demoPassword = 'Admin123'
export const members: Member[] = [
  { id: '1', name: 'Michael Joseph', relation: 'Father', image: 'https://i.pravatar.cc/100?img=11', generation: 0 },
  { id: '2', name: 'Sarah Joseph', relation: 'Mother', image: 'https://i.pravatar.cc/100?img=47', generation: 0 },
  { id: '3', name: 'John Joseph', relation: 'Brother', image: 'https://i.pravatar.cc/100?img=13', generation: 1 },
  { id: '4', name: 'Jonah Joseph', relation: 'You', image: user.avatar, generation: 1, selected: true },
  { id: '5', name: 'Samantha Michael', relation: 'Wife', image: 'https://i.pravatar.cc/100?img=45', generation: 1 },
  { id: '6', name: 'Emma Joseph', relation: 'Sister', image: 'https://i.pravatar.cc/100?img=32', generation: 1 },
  { id: '7', name: 'Sam Joseph', relation: 'Son', image: 'https://i.pravatar.cc/100?img=15', generation: 2 },
  { id: '8', name: 'Ethan Joseph', relation: 'Son', image: 'https://i.pravatar.cc/100?img=56', generation: 2 },
  { id: '9', name: 'Daniel Joseph', relation: 'Brother-in-law', image: 'https://i.pravatar.cc/100?img=68', generation: 1, isInLaw: true },
]
export const memories: Memory[] = [
  { id: 'm1', title: 'Summer Campfire', year: '2025', uploadedAt: '2025-07-18', image: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1000&q=80', count: 24 },
  { id: 'm2', title: 'Beach weekend', year: '2025', uploadedAt: '2025-06-08', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80', count: 18 },
  { id: 'm3', title: 'Our first home', year: '2024', uploadedAt: '2024-09-21', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80', count: 12 },
  { id: 'm4', title: 'Family reunion', year: '2024', uploadedAt: '2024-12-14', image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1000&q=80', count: 31 },
]
export const events: Event[] = [
  { id: 'e1', title: "Samantha’s Birthday", date: 'September 23, 2026', meta: '39 days left', category: 'Birthday', month: 'SEP', day: '23', location: 'Joseph family home', attendees: 12, image: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=900&q=80' },
  { id: 'e2', title: 'Family Reunion', date: 'October 17, 2026', meta: '63 days left', category: 'Gathering', month: 'OCT', day: '17', location: 'Greenwood Lakeside Park', attendees: 31, image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=80' },
  { id: 'e3', title: 'Michael & Sarah’s Anniversary', date: 'November 8, 2026', meta: '85 days left', category: 'Anniversary', month: 'NOV', day: '08', location: 'The Garden Room', attendees: 8, image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80' },
  { id: 'e4', title: 'Holiday Dinner', date: 'December 24, 2026', meta: '131 days left', category: 'Gathering', month: 'DEC', day: '24', location: 'Sarah and Michael’s home', attendees: 18, image: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&q=80' },
]
export const familyFiles: FamilyFile[] = [
  { id: 'f1', name: 'Joseph Family Tree.pdf', type: 'PDF', size: '2.4 MB', updated: 'Updated Apr 3, 2025', author: 'Timothy Bayode' },
  { id: 'f2', name: 'Grandma’s Sunday Recipes.docx', type: 'Document', size: '840 KB', updated: 'Updated Mar 19, 2025', author: 'Sarah Joseph' },
  { id: 'f3', name: 'Family Reunion Budget.xlsx', type: 'Spreadsheet', size: '1.1 MB', updated: 'Updated Feb 28, 2025', author: 'Samantha Michael' },
  { id: 'f4', name: 'Voices from the Old House.mp3', type: 'Audio', size: '18.6 MB', updated: 'Updated Jan 12, 2025', author: 'Michael Joseph' },
  { id: 'f5', name: 'Important Family Dates.pdf', type: 'PDF', size: '1.7 MB', updated: 'Updated Dec 8, 2024', author: 'Timothy Bayode' },
]
export const activities: Activity[] = [{ id: 'a1', type: 'Memory', title: 'added 103 photos on April 3, 2025 to memories', author: 'Samantha Michael', time: 'April 2025', images: [memories[0].image, memories[1].image] }, { id: 'a2', type: 'Event', title: 'created a new family event', author: 'Lisa Jane', time: 'Jun 23', images: [memories[2].image] }]
export const family: Family = { name: "John Michael’s Family", members }
export const conversations: Conversation[] = [{ id: 'c1', title: 'Family recipes', messages: [{ id: 'q1', role: 'user', content: 'What recipes have we saved from grandma?' }, { id: 'a1', role: 'assistant', content: 'I found three recipes connected to Grandma Joseph: her Sunday tomato sauce, lemon cake, and the handwritten holiday stuffing recipe.', source: 'Memories · 3 sources' }] }]

export const stageLabels: Record<UploadStage, string> = { idle: 'Choose files', uploading: 'Uploading', processing: 'Processing', transcribing: 'Transcribing', extracting: 'Extracting details', complete: 'Complete' }
export const delay = (ms = 350) => new Promise(resolve => setTimeout(resolve, ms))

export const authService = {
  async signIn(email: string, password: string) { await delay(); if (email.trim().toLowerCase() !== user.email || password !== demoPassword) throw new Error('Incorrect email or password.'); return user },
  async signUp(name: string, email: string, password: string) { await delay(); if (!name.trim() || !email.includes('@') || password.length < 8) throw new Error('Enter your name, a valid email, and an 8-character password.'); return { ...user, name, email } },
}
export const familyService = { async getFamily() { await delay(100); return family }, async invite(email: string) { await delay(); if (!email.includes('@')) throw new Error('Enter a valid email address.'); return true } }
export const memoryService = { async getMemories() { await delay(100); return memories } }
export const chatService = { async ask(question: string) { await delay(700); return { id: crypto.randomUUID(), role: 'assistant' as const, content: `I searched your private family archive for “${question}”. I found a few connected memories and can help you explore them further.`, source: 'Kinship archive · 4 sources' } } }
export const storageService = { async upload(onStage: (stage: UploadStage) => void) { for (const stage of ['uploading', 'processing', 'transcribing', 'extracting', 'complete'] as UploadStage[]) { onStage(stage); await delay(450) } } }

export function initials(name: string) { return name.split(' ').map(part => part[0]).join('').slice(0, 2) }
