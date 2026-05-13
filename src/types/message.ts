import { Timestamp } from 'firebase/firestore';

export type MessageType = 'text' | 'audio' | 'image' | 'video';

export interface Message {
  id: string;
  senderId: string;
  type: MessageType;
  text?: string;
  mediaUrl?: string;
  mediaThumbnail?: string;
  duration?: number;
  createdAt: Timestamp;
  editedAt?: Timestamp;
  reactions?: Record<string, string>;
  readBy?: Record<string, Timestamp>;
  deletedFor?: string[];
  deletedForEveryone?: boolean;
}
