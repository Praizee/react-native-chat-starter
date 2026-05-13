import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const { user, ready } = useAuthStore();
  if (!ready) return null;
  return user ? <Redirect href="/chats" /> : <Redirect href="/login" />;
}
