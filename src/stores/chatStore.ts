import { create } from 'zustand';
import { Message } from '@/types/message';

interface ChatState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  typingUsers: Record<string, boolean>;
  setMessages: (messages: Message[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  setTypingUsers: (typingUsers: Record<string, boolean>) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  loading: true,
  error: null,
  searchQuery: '',
  typingUsers: {},
  setMessages: (messages) => set({ messages, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setTypingUsers: (typingUsers) => set({ typingUsers }),
  reset: () => set({ messages: [], loading: true, error: null, searchQuery: '', typingUsers: {} }),
}));
