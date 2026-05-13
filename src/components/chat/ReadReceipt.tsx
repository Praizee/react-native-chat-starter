import { StyleSheet, Text, View } from 'react-native';
import { Timestamp } from 'firebase/firestore';

export type ReceiptStatus = 'sending' | 'sent' | 'seen';

interface Props {
  status: ReceiptStatus;
}

export function ReadReceipt({ status }: Props) {
  if (status === 'sending') {
    return <Text style={styles.single}>✓</Text>;
  }
  if (status === 'sent') {
    return (
      <View style={styles.double}>
        <Text style={styles.checkGrey}>✓</Text>
        <Text style={[styles.checkGrey, styles.overlap]}>✓</Text>
      </View>
    );
  }
  // seen
  return (
    <View style={styles.double}>
      <Text style={styles.checkBlue}>✓</Text>
      <Text style={[styles.checkBlue, styles.overlap]}>✓</Text>
    </View>
  );
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

const styles = StyleSheet.create({
  single: { color: '#aaa', fontSize: 11, marginTop: 2 },
  double: { flexDirection: 'row', marginTop: 2 },
  checkGrey: { color: '#aaa', fontSize: 11 },
  checkBlue: { color: '#4fc3f7', fontSize: 11 },
  overlap: { marginLeft: -4 },
});
