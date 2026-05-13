import { Timestamp } from 'firebase/firestore';

export interface Conversation {
  id: string;
  participants: string[];
  participantNames?: Record<string, string>;
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  typingUsers?: Record<string, boolean>;
}
