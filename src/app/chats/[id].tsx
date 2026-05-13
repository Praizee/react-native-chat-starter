import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { useMessages } from '@/hooks/useMessages';
import { useChatStore } from '@/stores/chatStore';
import { useConversationsStore } from '@/stores/conversationsStore';
import { useAuthStore } from '@/stores/authStore';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ReadReceipt, getReceiptStatus } from '@/components/chat/ReadReceipt';
import { Message } from '@/types/message';

let typingTimer: ReturnType<typeof setTimeout> | null = null;

export default function ChatRoom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useMessages(id);

  const { messages, loading, error, typingUsers } = useChatStore();

  const someoneElseIsTyping = Object.entries(typingUsers).some(
    ([uid, isTyping]) => uid !== currentUid && isTyping,
  );
  const currentUid = useAuthStore((s) => s.user?.uid);

  const conversation = useConversationsStore((s) =>
    s.conversations.find((c) => c.id === id),
  );

  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList<Message>>(null);

  const otherName = (() => {
    if (!conversation?.participantNames || !currentUid) return 'Chat';
    const otherUid = conversation.participants?.find((u) => u !== currentUid);
    return otherUid ? (conversation.participantNames[otherUid] ?? 'Chat') : 'Chat';
  })();

  const setTyping = useCallback(
    async (isTyping: boolean) => {
      if (!currentUid || !id) return;
      await updateDoc(doc(db, 'conversations', id), {
        [`typingUsers.${currentUid}`]: isTyping,
      }).catch(() => {});
    },
    [currentUid, id],
  );

  const onChangeText = (val: string) => {
    setText(val);
    setTyping(true);
    if (typingTimer) clearTimeout(typingTimer);
    typingTimer = setTimeout(() => setTyping(false), 2000);
  };

  const send = async () => {
    if (!currentUid || !id || !text.trim()) return;
    const body = text.trim();
    setText('');
    if (typingTimer) clearTimeout(typingTimer);
    setTyping(false);

    await addDoc(collection(db, 'conversations', id, 'messages'), {
      senderId: currentUid,
      type: 'text',
      text: body,
      createdAt: serverTimestamp(),
      readBy: { [currentUid]: serverTimestamp() },
    });
    await updateDoc(doc(db, 'conversations', id), {
      lastMessage: body,
      lastMessageAt: serverTimestamp(),
    });
  };

  const visibleMessages = messages.filter(
    (m) =>
      !m.deletedForEveryone &&
      !(m.deletedFor?.includes(currentUid ?? '')),
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => router.replace(`/chats/${id}`)} />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>{otherName[0]?.toUpperCase()}</Text>
        </View>
        <Text style={styles.headerName}>{otherName}</Text>
      </View>

      {/* Messages */}
      {visibleMessages.length === 0 ? (
        <EmptyState message="No messages yet. Say hi!" />
      ) : (
        <FlatList
          ref={flatListRef}
          data={visibleMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          onLayout={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          renderItem={({ item }) => {
            const mine = item.senderId === currentUid;
            const deleted = item.deletedForEveryone;
            const participants = conversation?.participants ?? [];
            const receipt = mine
              ? getReceiptStatus(item.readBy, currentUid ?? '', participants)
              : null;
            return (
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                {deleted ? (
                  <Text style={styles.deletedText}>This message was deleted</Text>
                ) : (
                  <>
                    <Text style={mine ? styles.textMine : styles.textTheirs}>
                      {item.text}
                    </Text>
                    {item.editedAt && (
                      <Text style={styles.editedLabel}>Edited</Text>
                    )}
                  </>
                )}
                {mine && receipt && (
                  <View style={styles.receiptRow}>
                    <ReadReceipt status={receipt} />
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Typing indicator */}
      {someoneElseIsTyping && <TypingIndicator />}

      {/* Composer */}
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Message"
          value={text}
          onChangeText={onChangeText}
          multiline
          returnKeyType="default"
          onBlur={() => setTyping(false)}
        />
        <TouchableOpacity
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
          onPress={send}
          disabled={!text.trim()}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  back: { fontSize: 22, color: '#222', paddingRight: 4 },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: { color: '#fff', fontWeight: '700' },
  headerName: { fontWeight: '600', fontSize: 17, flex: 1 },
  list: { padding: 12, gap: 6, paddingBottom: 8 },
  bubble: { padding: 10, borderRadius: 16, maxWidth: '75%' },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: '#222' },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: '#f0f0f0' },
  textMine: { color: '#fff', fontSize: 15 },
  textTheirs: { color: '#111', fontSize: 15 },
  deletedText: { color: '#aaa', fontStyle: 'italic', fontSize: 14 },
  editedLabel: { color: '#aaa', fontSize: 11, marginTop: 2 },
  receiptRow: { alignItems: 'flex-end', marginTop: 2 },
  composer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderColor: '#eee',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 20,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#222',
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    borderRadius: 20,
  },
  sendButtonDisabled: { opacity: 0.4 },
  sendText: { color: '#fff', fontWeight: '600' },
});
