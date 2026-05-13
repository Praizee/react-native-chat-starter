import { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = (e: unknown) => {
    const msg = e instanceof Error ? e.message : 'Something went wrong';
    setError(msg.replace('Firebase: ', '').replace(/ \(auth\/.*\)\.?/, ''));
  };

  const onSignIn = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace('/chats');
    } catch (e) {
      handleError(e);
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
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: displayName.trim(),
        email: email.trim().toLowerCase(),
        createdAt: serverTimestamp(),
      });
      router.replace('/chats');
    } catch (e) {
      handleError(e);
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

      <TextInput
        style={styles.input}
        placeholder="Display name"
        autoCapitalize="words"
        value={displayName}
        onChangeText={setDisplayName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

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
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 6 },
  error: { color: '#c00', fontSize: 13, textAlign: 'center' },
  button: { backgroundColor: '#222', padding: 14, borderRadius: 6, alignItems: 'center' },
  buttonOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#222' },
  buttonText: { color: '#fff', fontWeight: '600' },
  buttonTextOutline: { color: '#222' },
});
