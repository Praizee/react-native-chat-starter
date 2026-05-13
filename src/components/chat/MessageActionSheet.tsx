import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface Props {
  visible: boolean;
  isMine: boolean;
  currentReaction?: string;
  onReact: (emoji: string) => void;
  onEdit: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
  onClose: () => void;
}

export function MessageActionSheet({
  visible,
  isMine,
  currentReaction,
  onReact,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onClose,
}: Props) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheet}>
          {/* Reaction strip */}
          <Text style={styles.sectionLabel}>React</Text>
          <View style={styles.emojiRow}>
            {EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.emojiButton,
                  currentReaction === emoji && styles.emojiButtonActive,
                ]}
                onPress={() => onReact(emoji)}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Actions */}
          {isMine && (
            <TouchableOpacity style={styles.action} onPress={onEdit}>
              <Text style={styles.actionText}>✏️  Edit message</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.action} onPress={onDeleteForMe}>
            <Text style={styles.actionText}>🗑️  Delete for me</Text>
          </TouchableOpacity>
          {isMine && (
            <TouchableOpacity style={styles.action} onPress={onDeleteForEveryone}>
              <Text style={[styles.actionText, styles.destructive]}>
                🗑️  Delete for everyone
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    gap: 4,
  },
  sectionLabel: {
    fontWeight: '600',
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginBottom: 8,
  },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  emojiButton: {
    padding: 10,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
  },
  emojiButtonActive: { backgroundColor: '#ffe082' },
  emoji: { fontSize: 26 },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 8 },
  action: { paddingVertical: 14, paddingHorizontal: 4 },
  actionText: { fontSize: 16, color: '#222' },
  destructive: { color: '#d32f2f' },
});
