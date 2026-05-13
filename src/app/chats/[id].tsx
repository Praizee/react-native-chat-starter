import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { getThumbnailAsync } from 'expo-video-thumbnails';
import { auth, db, storage } from '@/firebase';
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
import { AudioMessage } from '@/components/chat/AudioMessage';
import { MediaMessage } from '@/components/chat/MediaMessage';
import { Message } from '@/types/message';
import { compressImage } from '@/utils/mediaCompression';
import { requestAudioPermission } from '@/utils/audioRecorder';

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

  // Audio recording
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [sendingAudio, setSendingAudio] = useState(false);

  // Media
  const [sendingMedia, setSendingMedia] = useState(false);

  const otherName = (() => {
    if (!conversation?.participantNames || !currentUid) return 'Chat';
    const otherUid = conversation.participants?.find((u) => u !== currentUid);
    return otherUid ? (conversation.participantNames[otherUid] ?? 'Chat') : 'Chat';
  })();

  // ── Typing ────────────────────────────────────────────────────────────────
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

  // ── Send text ─────────────────────────────────────────────────────────────
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

  // ── Audio record ──────────────────────────────────────────────────────────
  const onMicPressIn = async () => {
    const granted = await requestAudioPermission();
    if (!granted) {
      Alert.alert('Permission needed', 'Microphone access is required to record audio.');
      return;
    }
    try {
      await AudioModule.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
      audioRecorder.record();
      setIsRecording(true);
    } catch {
      Alert.alert('Error', 'Could not start recording.');
    }
  };

  const onMicPressOut = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    setSendingAudio(true);
    try {
      await audioRecorder.stop();
      await AudioModule.setAudioModeAsync({ allowsRecording: false });
      const uri = audioRecorder.uri;
      const duration = Math.round((audioRecorder.currentTime ?? 0));
      if (!uri || duration < 1) return;

      await sendAudioMessage(uri, duration);
    } catch {
      Alert.alert('Error', 'Could not send audio message.');
    } finally {
      setSendingAudio(false);
    }
  };

  const sendAudioMessage = async (localUri: string, duration: number) => {
    if (!currentUid || !id) return;

    const msgRef = doc(collection(db, 'conversations', id, 'messages'));
    const storageRef = ref(storage, `audio/${id}/${msgRef.id}.m4a`);

    const blob = await fetch(localUri).then((r) => r.blob());
    await uploadBytes(storageRef, blob, { contentType: 'audio/m4a' });
    const mediaUrl = await getDownloadURL(storageRef);

    await addDoc(collection(db, 'conversations', id, 'messages'), {
      senderId: currentUid,
      type: 'audio',
      mediaUrl,
      duration,
      createdAt: serverTimestamp(),
      readBy: { [currentUid]: serverTimestamp() },
    });
    await updateDoc(doc(db, 'conversations', id), {
      lastMessage: '🎤 Voice message',
      lastMessageAt: serverTimestamp(),
    });
  };

  // ── Media pick & send ─────────────────────────────────────────────────────
  const pickAndSendMedia = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission needed', 'Gallery access is required to send media.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 1,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.length || !currentUid || !id) return;
    const asset = result.assets[0];

    setSendingMedia(true);
    try {
      const msgRef = doc(collection(db, 'conversations', id, 'messages'));

      if (asset.type === 'image') {
        const compressed = await compressImage(asset.uri);
        const blob = await fetch(compressed).then((r) => r.blob());
        const storageRef = ref(storage, `images/${id}/${msgRef.id}.jpg`);
        await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
        const mediaUrl = await getDownloadURL(storageRef);

        await addDoc(collection(db, 'conversations', id, 'messages'), {
          senderId: currentUid,
          type: 'image',
          mediaUrl,
          createdAt: serverTimestamp(),
          readBy: { [currentUid]: serverTimestamp() },
        });
        await updateDoc(doc(db, 'conversations', id), {
          lastMessage: '📷 Photo',
          lastMessageAt: serverTimestamp(),
        });
      } else {
        // Video — enforce 50 MB limit
        const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
        if (asset.fileSize && asset.fileSize > MAX_VIDEO_BYTES) {
          Alert.alert('File too large', 'Videos must be under 50 MB.');
          return;
        }

        // Generate thumbnail
        const { uri: thumbUri } = await getThumbnailAsync(asset.uri, { time: 0 });
        const thumbBlob = await fetch(thumbUri).then((r) => r.blob());
        const thumbRef = ref(storage, `videos/${id}/${msgRef.id}_thumb.jpg`);
        await uploadBytes(thumbRef, thumbBlob, { contentType: 'image/jpeg' });
        const mediaThumbnail = await getDownloadURL(thumbRef);

        // Upload video
        const videoBlob = await fetch(asset.uri).then((r) => r.blob());
        const videoRef = ref(storage, `videos/${id}/${msgRef.id}.mp4`);
        await uploadBytes(videoRef, videoBlob, { contentType: 'video/mp4' });
        const mediaUrl = await getDownloadURL(videoRef);

        await addDoc(collection(db, 'conversations', id, 'messages'), {
          senderId: currentUid,
          type: 'video',
          mediaUrl,
          mediaThumbnail,
          createdAt: serverTimestamp(),
          readBy: { [currentUid]: serverTimestamp() },
        });
        await updateDoc(doc(db, 'conversations', id), {
          lastMessage: '🎥 Video',
          lastMessageAt: serverTimestamp(),
        });
      }
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSendingMedia(false);
    }
  };

  // ── Reactions ─────────────────────────────────────────────────────────────
  const reactToMessage = async (msg: Message, emoji: string) => {
    setSheetTarget(null);
    if (!id || !currentUid) return;
    const existing = msg.reactions?.[currentUid];
    await updateDoc(doc(db, 'conversations', id, 'messages', msg.id), {
      [`reactions.${currentUid}`]: existing === emoji ? null : emoji,
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

  // ── Edit ──────────────────────────────────────────────────────────────────
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

  // ── Visible messages ──────────────────────────────────────────────────────
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
                  ) : item.type === 'audio' && item.mediaUrl ? (
                    <AudioMessage
                      uri={item.mediaUrl}
                      duration={item.duration ?? 0}
                      isMine={mine}
                    />
                  ) : (item.type === 'image' || item.type === 'video') && item.mediaUrl ? (
                    <MediaMessage
                      type={item.type}
                      mediaUrl={item.mediaUrl}
                      mediaThumbnail={item.mediaThumbnail}
                    />
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
        <TouchableOpacity
          style={styles.attachButton}
          onPress={pickAndSendMedia}
          disabled={sendingMedia}
        >
          {sendingMedia ? (
            <ActivityIndicator color="#222" size="small" />
          ) : (
            <Text style={styles.attachIcon}>📎</Text>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Message"
          value={text}
          onChangeText={onChangeText}
          multiline
          returnKeyType="default"
          onBlur={() => setTyping(false)}
        />

        {text.trim() ? (
          <TouchableOpacity style={styles.sendButton} onPress={send}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        ) : (
          <Pressable
            style={[styles.sendButton, isRecording && styles.sendButtonRecording]}
            onPressIn={onMicPressIn}
            onPressOut={onMicPressOut}
          >
            {sendingAudio ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendText}>{isRecording ? '⏹' : '🎤'}</Text>
            )}
          </Pressable>
        )}
      </View>

      {isRecording && (
        <View style={styles.recordingBanner}>
          <Text style={styles.recordingText}>● Recording… release to send</Text>
        </View>
      )}

      {/* Action sheet */}
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
  attachButton: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachIcon: { fontSize: 22 },
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
    alignItems: 'center',
    borderRadius: 20,
    minWidth: 60,
  },
  sendButtonRecording: { backgroundColor: '#d32f2f' },
  sendText: { color: '#fff', fontWeight: '600' },
  recordingBanner: {
    backgroundColor: '#d32f2f',
    paddingVertical: 6,
    alignItems: 'center',
  },
  recordingText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
