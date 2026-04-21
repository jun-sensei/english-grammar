import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/english-grammar/', // ← ここを追加（スラッシュで囲むのを忘れずに！）
})