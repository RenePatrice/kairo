import type { CapacitorConfig } from '@capacitor/cli';

/** Coque native : le même build web (dist/) emballé pour Android et iOS. */
const config: CapacitorConfig = {
  appId: 'app.kairo.planner',
  appName: 'Kairo',
  webDir: 'dist',
  backgroundColor: '#080A14',
  android: {
    // Pas de débogage web en version publiée.
    webContentsDebuggingEnabled: false,
  },
};

export default config;
