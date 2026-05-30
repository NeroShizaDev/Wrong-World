import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kotlew89.wrongworld',
  appName: 'Wrong World',
  webDir: 'dist',
  bundledWebRuntime: false,
  backgroundColor: '#07060d',
  android: {
    backgroundColor: '#07060d',
    webContentsDebuggingEnabled: true,
  },
};

export default config;
