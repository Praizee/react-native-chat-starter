import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAudioPlayer } from 'expo-audio';

interface Props {
  uri: string;
  duration: number; // seconds from Firestore
  isMine: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AudioMessage({ uri, duration, isMine }: Props) {
  const player = useAudioPlayer({ uri });
  const [speed, setSpeed] = useState<1 | 2>(1);

  const togglePlay = () => {
    if (player.playing) {
      player.pause();
    } else {
      // restart if finished
      if (player.duration > 0 && player.currentTime >= player.duration - 0.2) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  const toggleSpeed = () => {
    const next: 1 | 2 = speed === 1 ? 2 : 1;
    setSpeed(next);
    player.setPlaybackRate(next);
  };

  const elapsed = player.currentTime ?? 0;
  const total = player.duration > 0 ? player.duration : duration;
  const progress = total > 0 ? Math.min(elapsed / total, 1) : 0;

  const textColor = isMine ? '#fff' : '#111';
  const trackColor = isMine ? 'rgba(255,255,255,0.3)' : '#ccc';
  const fillColor = isMine ? '#fff' : '#222';

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.playButton} onPress={togglePlay}>
        <Text style={[styles.playIcon, { color: isMine ? '#fff' : '#222' }]}>
          {player.playing ? '⏸' : '▶'}
        </Text>
      </TouchableOpacity>

      <View style={styles.middle}>
        <View style={[styles.track, { backgroundColor: trackColor }]}>
          <View
            style={[
              styles.fill,
              { width: `${progress * 100}%`, backgroundColor: fillColor },
            ]}
          />
        </View>
        <Text style={[styles.time, { color: textColor }]}>
          {formatTime(player.playing || elapsed > 0 ? elapsed : total)}
        </Text>
      </View>

      <TouchableOpacity style={styles.speedButton} onPress={toggleSpeed}>
        <Text style={[styles.speedText, { color: textColor }]}>{speed}x</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 180,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: { fontSize: 16 },
  middle: { flex: 1, gap: 4 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  time: { fontSize: 11 },
  speedButton: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  speedText: { fontSize: 12, fontWeight: '700' },
});
