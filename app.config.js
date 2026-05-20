const packageJson = require('./package.json');

module.exports = {
  expo: {
    name: 'WhoStarts',
    slug: 'WhoStarts',
    version: packageJson.version,
    experiments: {
      baseUrl: '/games/whostarts',
    },
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#02030A',
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      permissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      ],
      package: 'com.sirmaxen.WhoStarts',
    },
    web: {
      output: 'single',
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-audio',
      'expo-iap',
      [
        'expo-build-properties',
        {
          android: {
            kotlinVersion: '2.2.0',
          },
        },
      ],
    ],
    extra: {
      enableMockBilling: true,
      eas: {
        projectId: 'bb522a6d-f93a-43fd-95ed-3ef14041894f',
      },
    },
  },
};
