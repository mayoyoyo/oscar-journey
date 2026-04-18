import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// HTTPS via basicSsl lets the dev server run as a secure context on LAN
// IPs, which is required for Web Crypto APIs like crypto.subtle.digest
// (used by the login flow). Phone browsers will warn about the self-
// signed cert — accept it once per device.
export default defineConfig({
  plugins: [react(), basicSsl()],
  base: '/',
  server: {
    host: true, // bind 0.0.0.0 so LAN devices can reach the dev server
    hmr: {
      // Tell the HMR client to connect back over wss (matches the https
      // dev server) — without this it falls back to plain ws and fails
      // silently on the phone, so changes never hot-reload there.
      protocol: 'wss',
    },
  },
})
