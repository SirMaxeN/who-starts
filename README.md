# WhoStarts?

WhoStarts? is a fast party helper built with Expo and React Native.
Everyone places a finger on the screen, the app waits for the chosen round mode, and then it picks exactly one winner who starts.

## MVP goals

- Android-first experience with good web support on mobile browsers
- Multi-touch round flow for 2 to 8 players
- Timed modes: `2s`, `3s`, `5s`, `10s`
- Manual mode with a central start button
- One winner per round
- Reset only after all fingers leave the screen
- Minimal English microcopy
- Neon sci-fi visual style
- Haptic feedback on supported devices
- Saved round mode on the device

## Current structure

- `App.tsx` starts the main screen
- `src/screens/` holds app screens
- `src/components/` holds reusable UI pieces
- `src/hooks/` holds round logic
- `src/services/` holds local persistence
- `src/constants/`, `src/types/`, `src/utils/` hold shared building blocks

## Tech stack

- Expo SDK 55
- React 19
- React Native 0.83
- TypeScript
- `expo-haptics`
- `@react-native-async-storage/async-storage`

## Running locally

1. Install dependencies:

```bash
npm install
```

2. Start the project:

```bash
npm run start
```

3. Open it on:

- Android with Expo Go
- Web in a browser

## Product direction

The first version focuses on one polished main interaction instead of many features:

- one main game screen
- one help popup
- one settings popup
- no accounts
- no backend
- no ranking
- no sound in MVP

## Status

The project now has:

- a structured codebase instead of one large file
- saved round mode settings
- timed and manual round modes
- winner selection flow
- base neon interface for the main screen
