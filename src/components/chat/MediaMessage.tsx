import { useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

const SCREEN = Dimensions.get('window');
const THUMB_SIZE = 200;

interface Props {
  type: 'image' | 'video';
  mediaUrl: string;
  mediaThumbnail?: string;
}

function VideoFullscreen({ uri, onClose }: { uri: string; onClose: () => void }) {
  const player = useVideoPlayer({ uri }, (p) => {
    p.play();
  });

  return (
    <View style={fs.container}>
      <VideoView
        player={player}
        style={fs.video}
        contentFit="contain"
        nativeControls
      />
      <TouchableOpacity style={fs.closeButton} onPress={onClose}>
        <Text style={fs.closeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

export function MediaMessage({ type, mediaUrl, mediaThumbnail }: Props) {
  const [fullscreen, setFullscreen] = useState(false);

  const thumbUri = type === 'video' ? mediaThumbnail : mediaUrl;

  return (
    <>
      <TouchableOpacity onPress={() => setFullscreen(true)} activeOpacity={0.9}>
        <View style={styles.thumb}>
          {thumbUri ? (
            <Image
              source={{ uri: thumbUri }}
              style={styles.thumbImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbPlaceholder} />
          )}
          {type === 'video' && (
            <View style={styles.playOverlay}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <Modal
        visible={fullscreen}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreen(false)}
        statusBarTranslucent
      >
        {type === 'image' ? (
          <Pressable style={fs.container} onPress={() => setFullscreen(false)}>
            <Image
              source={{ uri: mediaUrl }}
              style={fs.image}
              resizeMode="contain"
            />
            <TouchableOpacity style={fs.closeButton} onPress={() => setFullscreen(false)}>
              <Text style={fs.closeText}>✕</Text>
            </TouchableOpacity>
          </Pressable>
        ) : (
          <VideoFullscreen uri={mediaUrl} onClose={() => setFullscreen(false)} />
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbPlaceholder: { flex: 1, backgroundColor: '#555' },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playIcon: { fontSize: 36, color: '#fff' },
});

const fs = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN.width,
    height: SCREEN.height,
  },
  video: {
    width: SCREEN.width,
    height: SCREEN.height,
  },
  closeButton: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
