# HNG Stage 5 — React Native Chat App

A full-featured real-time chat app built on the HNG Stage 5 starter (Expo SDK 55, TypeScript, Firebase).

## Features

| Feature | Details |
|---------|---------|
| **Auth** | Email/password sign-in & sign-up; user profile written to Firestore on registration |
| **New chat** | Search users by name or email; reuses existing 1-to-1 conversation or creates one |
| **Typing indicator** | Animated three-dot bounce, real-time via Firestore |
| **Read receipts** | ✓ sending → ✓✓ sent → ✓✓ seen (blue), per-message, real-time |
| **Emoji reactions** | Long-press any message → bottom sheet picker (6 emoji); pill counts below bubble; toggle off |
| **Edit messages** | Long-press → Edit → inline text input in bubble → "Edited" label |
| **Delete messages** | Delete for me (local only) or delete for everyone (server-enforced ownership) |
| **Audio messages** | Hold mic button to record; release to upload and send; playback with 1× / 2× speed toggle and progress bar |
| **Image messages** | Gallery picker; client-side compression (max 1200 px, 0.7 quality); tap thumbnail → fullscreen |
| **Video messages** | Gallery picker; 50 MB guard; Cloudinary auto-generated thumbnail; tap → fullscreen with native controls |
| **In-chat search** | Header icon toggles search bar; debounced filter; matched substring highlighted in yellow; loading spinner + no-results state |
| **Offline queue** | Text messages enqueued in AsyncStorage; delivered on reconnect / foreground |
| **State management** | Zustand (authStore, chatStore, conversationsStore) — no setState pyramids |
| **Loading / error / empty** | Every async screen has all three states |

## Setup

```bash
pnpm install
cp .env.example .env
# fill in Firebase config values and Cloudinary credentials in .env
pnpm start
```

Open on iOS Simulator, Android Emulator, or a development build on device.

> **Expo Go caveat (SDK 55):** The Play Store / App Store Expo Go builds may lag behind SDK 55. Use the Expo Go TestFlight build on iOS, or let `pnpm start` download the latest Android build directly. A development build avoids this entirely.

## Firebase setup

1. Create a project at <https://console.firebase.google.com>.
2. Enable **Email/Password** in Authentication → Sign-in method.
3. Create a **Firestore Database** — paste the contents of `firestore.rules` into the Rules tab.
4. In Project settings → Your apps, add a **Web app** and copy the config keys into `.env`.

All features run on the free **Spark plan** — no Storage bucket or Blaze upgrade needed.

## Cloudinary setup (media uploads)

1. Create a free account at <https://cloudinary.com>.
2. Copy your **Cloud name** from the dashboard homepage.
3. Go to Settings → **Upload** → Upload presets → **Add upload preset** → set Signing Mode to **Unsigned** → save and copy the preset name.
4. Add both to `.env`:
   ```
   EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
   EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_preset_name
   ```

## Firestore data model

```
users/{uid}
  displayName, displayNameLower, email, createdAt

conversations/{id}
  participants[]        — UIDs
  participantNames{}    — uid → displayName
  lastMessage           — string preview
  lastMessageAt         — Timestamp
  typingUsers{}         — uid → boolean

conversations/{id}/messages/{msgId}
  senderId, type (text|audio|image|video)
  text?, mediaUrl?, mediaThumbnail?, duration?
  createdAt, editedAt?
  reactions{}           — uid → emoji
  readBy{}              — uid → Timestamp
  deletedFor[]          — UIDs (delete-for-me)
  deletedForEveryone?   — boolean
```

## Scripts

```bash
pnpm start          # start Expo dev server
pnpm android        # open on Android emulator
pnpm ios            # open on iOS simulator
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint --max-warnings 0
pnpm format         # prettier --write
```

## Project structure

```
src/
  app/
    _layout.tsx           root layout (GestureHandlerRootView, auth init)
    index.tsx             auth router
    login.tsx             sign-in / sign-up
    chats/
      index.tsx           conversation list
      new.tsx             new chat (user search)
      [id].tsx            chat room (all features)
  stores/
    authStore.ts
    chatStore.ts
    conversationsStore.ts
  hooks/
    useConversations.ts
    useMessages.ts
  components/
    chat/
      AudioMessage.tsx
      EmojiReactionPicker.tsx   (superseded by MessageActionSheet)
      MediaMessage.tsx
      MessageActionSheet.tsx
      MessageSearchBar.tsx
      ReadReceipt.tsx
      TypingIndicator.tsx
    ui/
      EmptyState.tsx
      ErrorState.tsx
      LoadingState.tsx
  types/
    conversation.ts
    message.ts
    user.ts
  utils/
    audioRecorder.ts
    mediaCompression.ts
    offlineQueue.ts
  firebase.ts
```

See [STACK.md](STACK.md) for package choices and technical decisions.
