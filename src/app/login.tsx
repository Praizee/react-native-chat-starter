import { useState } from 'react';
import {
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase';

const FIREBASE_ERROR_MAP: Record<string, string> = {
  'auth/user-not-found': 'No account found with that email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/email-already-in-use': 'An account with that email already exists.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/too-many-requests': 'Too many attempts. Try again later.',
};

function parseFirebaseError(e: unknown): string {
  if (e instanceof Error) {
    const match = e.message.match(/\(auth\/([^)]+)\)/);
    if (match) return FIREBASE_ERROR_MAP[`auth/${match[1]}`] ?? `Error: auth/${match[1]}`;
    return e.message.replace('Firebase: ', '');
  }
  return 'Something went wrong.';
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSignIn = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace('/chats');
    } catch (e) {
      setError(parseFirebaseError(e));
    } finally {
      setLoading(false);
    }
  };

  const onSignUp = async () => {
    if (!email.trim() || !password || !displayName.trim()) {
      setError('Name, email and password are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(user, { displayName: displayName.trim() });
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: displayName.trim(),
        email: email.trim().toLowerCase(),
        createdAt: serverTimestamp(),
      });
      router.replace('/chats');
    } catch (e) {
      setError(parseFirebaseError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>ChatApp</Text>
      <Text style={styles.subtitle}>Sign in or create an account</Text>

      <TextInput
        style={styles.input}
        placeholder="Display name"
        placeholderTextColor="#999"
        autoCapitalize="words"
        value={displayName}
        onChangeText={setDisplayName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <View style={styles.passwordRow}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
          <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.button} onPress={onSignIn} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign in</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.buttonOutline]}
        onPress={onSignUp}
        disabled={loading}
      >
        <Text style={[styles.buttonText, styles.buttonTextOutline]}>Sign up</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 28, justifyContent: 'center', gap: 12 },
  title: { fontSize: 32, fontWeight: '800', textAlign: 'center', color: '#111', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 16 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 14,
    borderRadius: 10,
    fontSize: 15,
    color: '#111',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontSize: 15,
    color: '#111',
  },
  eyeBtn: { paddingHorizontal: 14 },
  eyeText: { color: '#555', fontSize: 13, fontWeight: '600' },
  error: { color: '#c00', fontSize: 13, textAlign: 'center' },
  button: { backgroundColor: '#111', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  buttonOutline: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  buttonTextOutline: { color: '#111' },
});
