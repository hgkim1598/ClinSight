import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // amazon-cognito-identity-js 와 그 의존성이 Node 전역 `global` 을 참조해
  // 브라우저 런타임에서 "global is not defined" 에러를 낸다.
  // `globalThis` 로 컴파일 타임 치환해 폴리필 없이 해결.
  define: {
    global: 'globalThis',
  },
  server: {
    proxy: {
      // 로컬 개발 전용. SSH 터널(port 18080)을 통해 EC2 Nginx로 전달.
      // npm run build 결과물에는 포함되지 않음.
      '/api': {
        target: 'http://127.0.0.1:18080',
        changeOrigin: true,
      },
    },
  },
})
