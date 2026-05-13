import { useEffect } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { useConversationsStore } from '@/stores/conversationsStore';
import { Conversation } from '@/types/conversation';

export function useConversations() {
  const { setConversations, setError } = useConversationsStore();

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setError('Not authenticated');
      return;
    }

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', uid),
      orderBy('lastMessageAt', 'desc'),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const convos = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Omit<Conversation, 'id'>) }),
        );
        setConversations(convos);
      },
      (err) => setError(err.message),
    );

    return unsub;
  }, [setConversations, setError]);
}
