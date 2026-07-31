export default {
  workspaces: {
    '.': {
      entry: [
        'server.ts',
        'src/main.tsx',
        'vite.config.ts',
        'vitest.config.ts',
        'prisma.config.ts',
        'src/tests/**/*.{test,spec}.{ts,tsx}',
      ],
      project: ['src/**/*.{ts,tsx}', 'server.ts', 'vite.config.ts', 'vitest.config.ts', 'prisma.config.ts'],
      ignore: ['src/server/scripts/migrate-to-brain.ts'],
    },
    'apps/capacitor': {
      entry: ['capacitor.config.ts'],
      project: ['**/*.{ts,tsx,json}'],
      ignore: ['android/**', 'ios/**', 'android/app/src/main/assets/public/**'],
      ignoreDependencies: ['@capacitor/app', 'capacitor-secure-storage-plugin', 'build', 'gradlew.bat'],
    },
    'apps/mobile': {
      entry: ['app.json'],
      project: ['**/*.{ts,tsx,json}'],
      ignoreDependencies: ['@types/react', 'typescript', 'expo-updates', 'expo-system-ui'],
    },
  },
  ignoreBinaries: ['build', 'gradlew.bat'],
  rules: {
    dependencies: 'error',
    devDependencies: 'error',
    exports: 'off',
    files: 'error',
    types: 'off',
  },
};
