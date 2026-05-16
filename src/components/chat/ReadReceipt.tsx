import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';

export type ReceiptStatus = 'sending' | 'sent' | 'seen';

interface Props {
  status: ReceiptStatus;
}

export function ReadReceipt({ status }: Props) {
  if (status === 'sending') {
    return <Ionicons name="checkmark" size={13} color="#aaa" />;
  }
  if (status === 'sent') {
    return <Ionicons name="checkmark-done" size={13} color="#aaa" />;
  }
  return <Ionicons name="checkmark-done" size={13} color="#4fc3f7" />;
}

/**
 * Derives receipt status for a sent message.
 * - sending: createdAt not yet set (serverTimestamp pending)
 * - seen:    at least one other participant has a readBy entry
 * - sent:    saved to server but no other participant has read it yet
 */
export function getReceiptStatus(
  readBy: Record<string, Timestamp> | undefined,
  currentUid: string,
  participants: string[],
): ReceiptStatus {
  if (!readBy) return 'sending';
  // createdAt == null means serverTimestamp not resolved yet
  if (!readBy[currentUid]) return 'sending';

  const otherParticipants = participants.filter((uid) => uid !== currentUid);
  const seenByOther = otherParticipants.some((uid) => !!readBy[uid]);
  return seenByOther ? 'seen' : 'sent';
}

const styles = StyleSheet.create({});
