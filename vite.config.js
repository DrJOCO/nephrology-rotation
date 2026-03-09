import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'data': [
            './src/data/constants.ts',
            './src/data/guides.ts',
            './src/data/quizzes.ts',
            './src/data/cases.ts',
            './src/data/trials.ts',
            './src/data/images.ts',
          ],
        },
      },
    },
  },
})
