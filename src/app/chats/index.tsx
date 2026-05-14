import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase';
import { useConversations } from '@/hooks/useConversations';
import { useConversationsStore } from '@/stores/conversationsStore';
import { useAuthStore } from '@/stores/authStore';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ChatsList() {
  useConversations();

  const { conversations, loading, error } = useConversationsStore();
  const currentUid = useAuthStore((s) => s.user?.uid);
  const displayName = useAuthStore((s) => s.user?.displayName);

  const getOtherName = (participantNames?: Record<string, string>, participants?: string[]) => {
    if (!participantNames || !currentUid) return 'Chat';
    const otherUid = participants?.find((uid) => uid !== currentUid);
    return otherUid ? (participantNames[otherUid] ?? 'Unknown') : 'Chat';
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>Chats</Text>
          {displayName ? <Text style={styles.welcome}>Hey, {displayName} 👋</Text> : null}
        </View>
        <TouchableOpacity
          onPress={async () => {
            await signOut(auth);
            router.replace('/login');
          }}
        >
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyState message="No conversations yet. Start one!" />}
        renderItem={({ item }) => {
          const name = getOtherName(item.participantNames, item.participants);
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push(`/chats/${item.id}`)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{name[0].toUpperCase()}</Text>
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.title}>{name}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {item.lastMessage ?? 'No messages yet'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/chats/new')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  heading: { fontSize: 24, fontWeight: '700' },
  welcome: { fontSize: 13, color: '#888', marginTop: 2 },
  signOut: { color: '#888', fontSize: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 20 },
  rowContent: { flex: 1 },
  title: { fontWeight: '600', fontSize: 16 },
  subtitle: { color: '#666', marginTop: 2, fontSize: 14 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
});
