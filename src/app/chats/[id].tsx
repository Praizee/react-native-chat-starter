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
  arrayUnion,
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
import { MessageActionSheet } from '@/components/chat/MessageActionSheet';
import { Message } from '@/types/message';

let typingTimer: ReturnType<typeof setTimeout> | null = null;

export default function ChatRoom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useMessages(id);

  const currentUid = useAuthStore((s) => s.user?.uid);
  const { messages, loading, error, typingUsers } = useChatStore();
  const conversation = useConversationsStore((s) =>
    s.conversations.find((c) => c.id === id),
  );

  const someoneElseIsTyping = Object.entries(typingUsers).some(
    ([uid, isTyping]) => uid !== currentUid && isTyping,
  );

  // Composer
  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList<Message>>(null);

  // Action sheet
  const [sheetTarget, setSheetTarget] = useState<Message | null>(null);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

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

  // ── Reactions ────────────────────────────────────────────────────────────
  const reactToMessage = async (msg: Message, emoji: string) => {
    setSheetTarget(null);
    if (!id || !currentUid) return;
    const existing = msg.reactions?.[currentUid];
    const value = existing === emoji ? null : emoji;
    await updateDoc(doc(db, 'conversations', id, 'messages', msg.id), {
      [`reactions.${currentUid}`]: value,
    }).catch(() => {});
  };

  const tallyReactions = (reactions?: Record<string, string>) => {
    if (!reactions) return [];
    const counts: Record<string, number> = {};
    for (const emoji of Object.values(reactions)) {
      if (emoji) counts[emoji] = (counts[emoji] ?? 0) + 1;
    }
    return Object.entries(counts);
  };

  // ── Edit ─────────────────────────────────────────────────────────────────
  const startEdit = (msg: Message) => {
    setSheetTarget(null);
    setEditingId(msg.id);
    setEditText(msg.text ?? '');
  };

  const confirmEdit = async () => {
    if (!editingId || !id || !editText.trim()) return;
    await updateDoc(doc(db, 'conversations', id, 'messages', editingId), {
      text: editText.trim(),
      editedAt: serverTimestamp(),
    }).catch(() => {});
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteForMe = async (msg: Message) => {
    setSheetTarget(null);
    if (!id || !currentUid) return;
    await updateDoc(doc(db, 'conversations', id, 'messages', msg.id), {
      deletedFor: arrayUnion(currentUid),
    }).catch(() => {});
  };

  const deleteForEveryone = async (msg: Message) => {
    setSheetTarget(null);
    if (!id) return;
    await updateDoc(doc(db, 'conversations', id, 'messages', msg.id), {
      deletedForEveryone: true,
    }).catch(() => {});
  };

  // ── Render ────────────────────────────────────────────────────────────────
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
            const isEditing = editingId === item.id;
            const participants = conversation?.participants ?? [];
            const receipt = mine
              ? getReceiptStatus(item.readBy, currentUid ?? '', participants)
              : null;
            const reactionTally = tallyReactions(item.reactions);

            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onLongPress={() => !deleted && setSheetTarget(item)}
                delayLongPress={300}
              >
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  {deleted ? (
                    <Text style={styles.deletedText}>This message was deleted</Text>
                  ) : isEditing ? (
                    <View style={styles.editContainer}>
                      <TextInput
                        style={styles.editInput}
                        value={editText}
                        onChangeText={setEditText}
                        autoFocus
                        multiline
                      />
                      <View style={styles.editActions}>
                        <TouchableOpacity onPress={cancelEdit}>
                          <Text style={styles.editCancel}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={confirmEdit}>
                          <Text style={styles.editConfirm}>Save</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
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
                  {mine && receipt && !isEditing && (
                    <View style={styles.receiptRow}>
                      <ReadReceipt status={receipt} />
                    </View>
                  )}
                </View>

                {/* Reaction pills */}
                {reactionTally.length > 0 && (
                  <View
                    style={[
                      styles.reactionRow,
                      mine ? styles.reactionRowMine : styles.reactionRowTheirs,
                    ]}
                  >
                    {reactionTally.map(([emoji, count]) => (
                      <TouchableOpacity
                        key={emoji}
                        style={[
                          styles.reactionPill,
                          item.reactions?.[currentUid ?? ''] === emoji &&
                            styles.reactionPillActive,
                        ]}
                        onPress={() => reactToMessage(item, emoji)}
                      >
                        <Text style={styles.reactionEmoji}>{emoji}</Text>
                        {count > 1 && (
                          <Text style={styles.reactionCount}>{count}</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
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

      {/* Action sheet (reactions + edit/delete) */}
      <MessageActionSheet
        visible={sheetTarget !== null}
        isMine={sheetTarget?.senderId === currentUid}
        currentReaction={sheetTarget?.reactions?.[currentUid ?? '']}
        onReact={(emoji) => sheetTarget && reactToMessage(sheetTarget, emoji)}
        onEdit={() => sheetTarget && startEdit(sheetTarget)}
        onDeleteForMe={() => sheetTarget && deleteForMe(sheetTarget)}
        onDeleteForEveryone={() => sheetTarget && deleteForEveryone(sheetTarget)}
        onClose={() => setSheetTarget(null)}
      />
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
  editContainer: { gap: 8 },
  editInput: {
    color: '#fff',
    fontSize: 15,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingBottom: 4,
    minWidth: 160,
  },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  editCancel: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  editConfirm: { color: '#fff', fontWeight: '700', fontSize: 13 },
  reactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
    maxWidth: '75%',
  },
  reactionRowMine: { alignSelf: 'flex-end' },
  reactionRowTheirs: { alignSelf: 'flex-start' },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reactionPillActive: { borderColor: '#ffc107', backgroundColor: '#fff8e1' },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 12, color: '#555', fontWeight: '600' },
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
