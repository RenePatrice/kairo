import type { CapacitorConfig } from '@capacitor/cli';

/** Coque native : le même build web (dist/) emballé pour Android et iOS. */
const config: CapacitorConfig = {
  appId: 'app.kairo.planner',
  appName: 'Kairo',
  webDir: 'dist',
  backgroundColor: '#080A14',
  plugins: {
    LocalNotifications: {
      // Anneau Kairo monochrome dans la barre d'état (sinon un carré gris).
      smallIcon: 'ic_stat_kairo',
      iconColor: '#B4A5FF',
    },
  },
  android: {
    // Pas de débogage web en version publiée.
    webContentsDebuggingEnabled: false,
  },
};

export default config;
