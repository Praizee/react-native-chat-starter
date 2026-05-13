import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const MAX_DIMENSION = 1200;
const QUALITY = 0.7;

export async function compressImage(uri: string): Promise<string> {
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: QUALITY, format: SaveFormat.JPEG },
  );
  return result.uri;
}
