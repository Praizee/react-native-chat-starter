# Stack & Technical Decisions

## State management — Zustand

**Package:** `zustand@^5`

**Why:** The brief explicitly requires a declared state management library with no `setState` pyramids. Zustand was chosen over Redux Toolkit and Jotai for three reasons:

1. Zero boilerplate — a store is a single `create()` call with typed state + actions, no reducers, no providers, no context wrappers.
2. Selector-based subscriptions — components only re-render when the slice they subscribe to changes (`useAuthStore(s => s.user)`), which matters in a chat list that updates frequently.
3. Works outside React — the offline queue and Firestore hooks can call `store.getState()` / `store.setState()` without being inside a component tree.

Three stores: `authStore` (Firebase auth user + ready flag), `conversationsStore` (list + loading/error), `chatStore` (messages, typing map, search query, loading/error).

---

## Audio — expo-audio

**Package:** `expo-audio@55`

**Why:** `expo-av` is deprecated as of Expo SDK 51. `expo-audio` is the current replacement with a hook-first API (`useAudioRecorder`, `useAudioPlayer`) that integrates with React's render cycle naturally. Key benefits over `expo-av`:

- `useAudioPlayer` exposes `player.currentTime`, `player.duration`, `player.playing` as reactive properties — no manual status polling loop needed.
- `useAudioRecorder` manages recording lifecycle (prepare → record → stop) without manual ref juggling.
- `AudioModule.requestRecordingPermissionsAsync()` and `AudioModule.setAudioModeAsync()` are clean static calls.

Recording preset: `RecordingPresets.HIGH_QUALITY` (AAC, 44.1 kHz). Speed toggle uses `player.setPlaybackRate(2)`.

---

## Video — expo-video

**Package:** `expo-video@55`

**Why:** The natural pair to `expo-audio`. `expo-av`'s `Video` component is deprecated alongside `Audio`. `expo-video` provides `useVideoPlayer` + `<VideoView nativeControls>` which renders platform-native controls (scrubber, fullscreen button) with no custom UI needed. Auto-plays on modal open via the `useVideoPlayer` initializer callback.

---

## Video thumbnails — Cloudinary transformation URL

**No extra package.** After uploading a video to Cloudinary, the thumbnail URL is derived from the video URL by injecting the `so_0` transformation (seek to second 0) and swapping the extension to `.jpg`. Cloudinary generates the JPEG on first request and caches it on the CDN. This eliminates a separate thumbnail upload and removes the `expo-video-thumbnails` dependency.

```ts
const mediaThumbnail = mediaUrl
  .replace('/video/upload/', '/video/upload/so_0/')
  .replace(/\.\w+$/, '.jpg');
```

---

## Image compression — expo-image-manipulator

**Package:** `expo-image-manipulator@55`

**Why:** Required by the brief — raw uploads are explicitly rejected. `manipulateAsync` runs on the native image pipeline (not JS), so it handles large camera photos without blocking the JS thread. Config: resize width to 1200 px max (preserves aspect ratio), JPEG quality 0.7. Typical reduction: 4–8 MB camera photo → 300–600 KB.

---

## Gallery / camera picker — expo-image-picker

**Package:** `expo-image-picker@55`

**Why:** Standard Expo package for accessing the photo library and camera. `launchImageLibraryAsync` with `mediaTypes: ['images', 'videos']` gives a single picker that handles both. Returns `asset.type`, `asset.uri`, and `asset.fileSize` — the size is used to enforce the 50 MB video cap before uploading.

---

## Offline queue — @react-native-async-storage/async-storage

**Package:** `@react-native-async-storage/async-storage@2.2.0` (v3 breaks Android — `org.asyncstorage.shared_storage` artifact not resolvable)

**Why:** Text messages are enqueued to AsyncStorage before the Firestore write is attempted. If the write fails (no network), the message stays persisted on-device. An `AppState` listener flushes the queue every time the app returns to foreground. This gives reliable delivery across app restarts without needing a separate network-state library.

Only text messages are queued — media uploads require an active connection by nature (large blob upload), so they surface an alert on failure instead.

---

## Navigation — Expo Router

**Already in starter.** File-based routing maps cleanly to the three screen levels: `/login`, `/chats` (list), `/chats/[id]` (room), `/chats/new` (user search). No additional navigation library needed.

---

## Media storage — Cloudinary

**Package:** `@expo/vector-icons` is unrelated — Cloudinary is accessed via plain `fetch` with no SDK.

**Why over Firebase Storage:** Firebase Storage requires the Blaze (pay-as-you-go) plan and a billing card. Cloudinary's free tier (25 GB storage, 25 GB bandwidth/month) covers this app's needs with no card required. Uploads use an **unsigned upload preset**, which is safe to use client-side — the preset name and cloud name are public by design (they appear in every CDN URL).

Upload endpoint: `https://api.cloudinary.com/v1_1/{cloud}/{image|video}/upload`  
Audio is uploaded as `video` resource type (Cloudinary's unified type for all audio/video).  
Env vars: `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME`, `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.

---

## Firebase

**Already in starter.** Firebase JS SDK v11 with two services:

- **Auth** — email/password only; `onAuthStateChanged` fed into `authStore` from `_layout.tsx` so the listener lives for the app's lifetime.
- **Firestore** — all real-time data (messages, conversations, typing, reactions, receipts). Security rules in `firestore.rules` enforce per-user ownership for edit, delete-for-everyone, and reactions. User docs store `displayNameLower` (lowercase of `displayName`) to enable case-insensitive prefix search in the new-chat screen.

Firebase Storage is **not used** — media is handled by Cloudinary.

---

## Animation — React Native Animated (built-in)

The typing indicator uses `Animated.loop(Animated.sequence([...]))` with `useNativeDriver: true`. No third-party animation library was added — the single looping bounce animation doesn't justify pulling in Reanimated for this specific use case (Reanimated is already in the project as a peer dep but not used directly here).

---

## Gesture handling — react-native-gesture-handler

**Already in starter.** `GestureHandlerRootView` wraps the root layout in `_layout.tsx` (added in Phase 0) to ensure long-press gestures on message bubbles are recognised correctly on Android.

---

## No additions

The following were considered and deliberately not added:

| Candidate | Reason skipped |
|-----------|---------------|
| `@react-native-community/netinfo` | `AppState` is sufficient for the offline flush trigger; avoids an extra native module |
| `react-native-reanimated` (direct use) | Already a peer dep; the single animation in scope doesn't need it |
| UI component library (e.g. Tamagui) | Adds significant bundle size and build complexity for what is already a functional UI |
| Firestore offline persistence (`persistentLocalCache`) | Not reliably available in the Firebase JS SDK on React Native without additional polyfills; AsyncStorage queue is explicit and testable |
