import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  addDoc,
  collection,
  getDocs,
  limit,
  or,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { UserProfile } from '@/types/user';

export default function NewChat() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUid = auth.currentUser?.uid;

  const searchUsers = async (text: string) => {
    setSearch(text);
    const trimmed = text.trim().toLowerCase();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const usersRef = collection(db, 'users');
      // Search by email prefix or displayName prefix (case-insensitive via stored lowercase)
      const [emailSnap, nameSnap] = await Promise.all([
        getDocs(
          query(
            usersRef,
            where('email', '>=', trimmed),
            where('email', '<=', trimmed + ''),
            limit(10),
          ),
        ),
        getDocs(
          query(
            usersRef,
            where('displayNameLower', '>=', trimmed),
            where('displayNameLower', '<=', trimmed + ''),
            limit(10),
          ),
        ),
      ]);

      const seen = new Set<string>();
      const merged: UserProfile[] = [];
      for (const snap of [emailSnap, nameSnap]) {
        for (const d of snap.docs) {
          if (!seen.has(d.id) && d.id !== currentUid) {
            seen.add(d.id);
            merged.push({ uid: d.id, ...(d.data() as Omit<UserProfile, 'uid'>) });
          }
        }
      }
      setResults(merged);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (other: UserProfile) => {
    if (!currentUid) return;
    setCreating(true);
    setError(null);
    try {
      // Check for existing 1-to-1 conversation
      const existingSnap = await getDocs(
        query(
          collection(db, 'conversations'),
          where('participants', 'array-contains', currentUid),
        ),
      );

      const existing = existingSnap.docs.find((d) => {
        const p: string[] = d.data().participants ?? [];
        return p.includes(other.uid) && p.length === 2;
      });

      if (existing) {
        router.replace(`/chats/${existing.id}`);
        return;
      }

      const currentUser = auth.currentUser;
      const myName = currentUser?.displayName ?? currentUser?.email ?? currentUid;

      const convoRef = await addDoc(collection(db, 'conversations'), {
        participants: [currentUid, other.uid],
        participantNames: {
          [currentUid]: myName,
          [other.uid]: other.displayName,
        },
        lastMessage: null,
        lastMessageAt: serverTimestamp(),
        typingUsers: {},
      });

      router.replace(`/chats/${convoRef.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start chat');
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.title}>New Chat</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Search by name or email…"
        autoCapitalize="none"
        value={search}
        onChangeText={searchUsers}
        autoFocus
      />

      {error && <Text style={styles.error}>{error}</Text>}

      {creating && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#222" />
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.uid}
        ListEmptyComponent={
          !loading && search.trim().length >= 2 ? (
            <Text style={styles.empty}>No users found for "{search}"</Text>
          ) : null
        }
        ListHeaderComponent={loading ? <ActivityIndicator style={styles.spinner} /> : null}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => startChat(item)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.displayName[0].toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.name}>{item.displayName}</Text>
              <Text style={styles.email}>{item.email}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  title: { fontSize: 18, fontWeight: '700' },
  input: {
    margin: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    fontSize: 15,
  },
  error: { color: '#c00', fontSize: 13, marginHorizontal: 16 },
  spinner: { marginTop: 16 },
  empty: { color: '#999', textAlign: 'center', marginTop: 32, fontSize: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  name: { fontWeight: '600', fontSize: 15 },
  email: { color: '#888', fontSize: 13 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});
