import { useEffect } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { useChatStore } from '@/stores/chatStore';
import { Message } from '@/types/message';

export function useMessages(conversationId: string) {
  const { setMessages, setError, setTypingUsers, reset } = useChatStore();

  useEffect(() => {
    if (!conversationId) return;
    reset();

    const uid = auth.currentUser?.uid;

    // Listen to messages
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc'),
    );

    const unsubMessages = onSnapshot(
      q,
      async (snap) => {
        const msgs = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Omit<Message, 'id'>) }),
        );
        setMessages(msgs);

        // Mark unread messages as seen
        if (!uid) return;
        const unread = snap.docs.filter((d) => {
          const data = d.data();
          return data.senderId !== uid && !data.readBy?.[uid];
        });
        if (unread.length === 0) return;
        const batch = writeBatch(db);
        for (const d of unread) {
          batch.update(d.ref, { [`readBy.${uid}`]: serverTimestamp() });
        }
        await batch.commit().catch(() => {});
      },
      (err) => setError(err.message),
    );

    // Listen to typingUsers on the conversation doc
    const unsubTyping = onSnapshot(
      doc(db, 'conversations', conversationId),
      (snap) => {
        const data = snap.data();
        setTypingUsers((data?.typingUsers as Record<string, boolean>) ?? {});
      },
    );

    return () => {
      unsubMessages();
      unsubTyping();
    };
  }, [conversationId, reset, setError, setMessages, setTypingUsers]);
}
