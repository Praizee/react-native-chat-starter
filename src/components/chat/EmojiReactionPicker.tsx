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
  currentReaction?: string;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiReactionPicker({ visible, currentReaction, onSelect, onClose }: Props) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={styles.label}>React</Text>
          <View style={styles.row}>
            {EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.emojiButton,
                  currentReaction === emoji && styles.emojiButtonActive,
                ]}
                onPress={() => onSelect(emoji)}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
    paddingBottom: 36,
    gap: 12,
  },
  label: { fontWeight: '600', fontSize: 15, color: '#444', textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  emojiButton: {
    padding: 10,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
  },
  emojiButtonActive: { backgroundColor: '#ffe082' },
  emoji: { fontSize: 28 },
});
