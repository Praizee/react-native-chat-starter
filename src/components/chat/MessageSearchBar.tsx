import { useRef } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  value: string;
  searching: boolean;
  onChange: (text: string) => void;
  onClose: () => void;
}

export function MessageSearchBar({ value, searching, onChange, onClose }: Props) {
  const inputRef = useRef<TextInput>(null);

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder="Search messages…"
        value={value}
        onChangeText={onChange}
        autoFocus
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {searching && <ActivityIndicator style={styles.spinner} size="small" color="#888" />}
      <TouchableOpacity
        onPress={() => {
          onChange('');
          onClose();
        }}
      >
        <Text style={styles.cancel}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Splits `text` into [before, match, after] segments for a case-insensitive
 * `query`. Returns null when there's no match.
 */
export function splitHighlight(
  text: string,
  query: string,
): [string, string, string] | null {
  if (!query) return null;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return null;
  return [text.slice(0, idx), text.slice(idx, idx + query.length), text.slice(idx + query.length)];
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    backgroundColor: '#f7f7f7',
  },
  spinner: { marginRight: -4 },
  cancel: { color: '#222', fontWeight: '600', fontSize: 15 },
});
