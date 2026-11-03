import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.accesskasir.app',
  appName: 'Access Kasir',
  webDir: 'public',
  server: {
    url: 'https://app-kasirl.vercel.app/login',
    cleartext: true
  }
};

export default config;