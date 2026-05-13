import { AudioModule } from 'expo-audio';

export async function requestAudioPermission(): Promise<boolean> {
  const { granted } = await AudioModule.requestRecordingPermissionsAsync();
  return granted;
}
