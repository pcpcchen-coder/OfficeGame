import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // 相對路徑，方便放在 GitHub Pages 等靜態空間
  base: './',
  plugins: [react()],
})
