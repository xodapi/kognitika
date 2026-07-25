import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kognitika.mobile',
  appName: 'Kognitika',
  webDir: '../../dist',
  backgroundColor: '#0A0E1A',
  server: {
    hostname: 'localhost',
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0A0E1A',
  },
  ios: {
    backgroundColor: '#0A0E1A',
    contentInset: 'automatic',
  },
};

export default config;
