# WhoStarts

WhoStarts is a mobile-first party and tabletop game helper built with Expo and
React Native. The free app helps a group pick who starts by placing multiple
fingers on one screen. Premium unlocks extra helpers for turn order, dice,
coin flips, and score tracking.

## Features

### Free

- Multi-touch "who starts" picker
- Timed selection modes
- Manual selection mode
- Local settings for sounds, music, haptics, and animations
- No account required
- No ads

### Premium

- Turn Order: generate a full player order
- Dice Roll: roll D4, D6, D8, D10, D12, and D20
- Quick Flip: flip Heads/Tails, Yes/No, Do/Skip, Left/Right, and Odd/Even
- Scoreboard: track player scores and local score history
- Google Play Billing purchase and restore flows on Android
- Google Play promo code support through normal Play redemption and restore

## Tech Stack

- Expo SDK 55
- React 19
- React Native 0.83
- TypeScript
- `expo-iap` for Google Play Billing
- `expo-audio`
- `expo-haptics`
- `@react-native-async-storage/async-storage`
- `@shopify/react-native-skia`

## Project Structure

- `App.tsx` starts the app
- `app.config.js` contains Expo config and reads the app version from `package.json`
- `src/screens/` contains app screens
- `src/components/` contains reusable UI
- `src/hooks/` contains game, sound, music, premium, and score logic
- `src/services/` contains local persistence
- `src/constants/`, `src/types/`, and `src/utils/` contain shared definitions
- `docs/privacy.html` is the GitHub Pages privacy policy page

## Versioning

The app version lives in `package.json`.

`app.config.js` reads that version and passes it to Expo:

```js
version: packageJson.version
```

To bump the patch version:

```bash
npm run bump:version
```

## Running Locally

Install dependencies:

```bash
npm install
```

Start Expo:

```bash
npm run start
```

Start web:

```bash
npm run web
```

Google Play Billing does not work in Expo Go. Use EAS builds for native billing
tests.

## Web Screenshot Helper

For store screenshots, the web development build includes a dev-only mouse helper
for simulating multiple fingers and showing the premium screens.

Run the dedicated dev screenshot command:

```bash
npm run web:dev-screenshots
```

In the browser:

- hold `1` and click to place or move Player 1
- hold `2` and click to place or move Player 2
- repeat with `3`, `4`, `5`, and `6`
- click without holding a number to clear all simulated fingers
- press `0` to clear all simulated fingers

This helper is guarded by `__DEV__`, so it is not active in production exports or
Android builds.

Production web export does not include this helper:

```bash
npm run build:web
```

## Android Builds

Build a production Android App Bundle for Google Play:

```bash
npm run build:android:production
```

Build an internal preview APK:

```bash
npm run build:android:preview
```

For real Google Play Billing tests, upload the production `.aab` to an Internal
testing track in Google Play Console and install the app from Google Play with a
tester account.

## Premium Testing

Development Android builds can use mock billing when
`expo.extra.enableMockBilling` is `true` in `app.config.js`. The mock is guarded by
`__DEV__`, so production builds still use real Google Play Billing.

To test real billing:

- create a one-time product with ID `premium_unlock`
- make the product active in Google Play Console
- add tester accounts to Internal testing
- add license testers for test purchases
- install the build from Google Play, not directly from an APK

## Privacy

WhoStarts does not use accounts, ads, analytics, location tracking, or a backend.
Game settings, history, and premium status are stored locally on the device.

Privacy policy:

```text
https://sirmaxen.github.io/who-starts/privacy.html
```
