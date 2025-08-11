import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react(), sentryVitePlugin({
    org: "bloop-ai",
    project: "vibe-kanban"
  })],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "shared": path.resolve(__dirname, "../shared"),
    },
  },

  server: {
    port: parseInt(process.env.FRONTEND_PORT || '3000'),
    host: true, // Listen on all network interfaces
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'macbook-air.tail5f04b.ts.net',
      'google-pixel-8-pro.tail5f04b.ts.net',
      '.tail5f04b.ts.net', // Allow all hosts in your tailnet
    ],
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.BACKEND_PORT || '3001'}`,
        changeOrigin: true,
      },
    },
  },

  build: {
    sourcemap: true
  }
})
