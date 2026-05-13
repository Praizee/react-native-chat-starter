import { create } from 'zustand';
import { Conversation } from '@/types/conversation';

interface ConversationsState {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  setConversations: (conversations: Conversation[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useConversationsStore = create<ConversationsState>((set) => ({
  conversations: [],
  loading: true,
  error: null,
  setConversations: (conversations) => set({ conversations, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}));
