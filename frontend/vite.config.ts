import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Ensure environment variables are available in the app
    'process.env.VITE_USER_POOL_ID': JSON.stringify(process.env.VITE_USER_POOL_ID),
    'process.env.VITE_USER_POOL_CLIENT_ID': JSON.stringify(process.env.VITE_USER_POOL_CLIENT_ID),
    'process.env.VITE_REGION': JSON.stringify(process.env.VITE_REGION),
    'process.env.VITE_GRAPHQL_ENDPOINT': JSON.stringify(process.env.VITE_GRAPHQL_ENDPOINT),
    'process.env.VITE_MAP_NAME': JSON.stringify(process.env.VITE_MAP_NAME),
  },
})