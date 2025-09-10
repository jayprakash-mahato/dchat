import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss({
      config: {
        theme: {
          extend: {
            colors: {
              primary: "#2563eb",
              secondary: "#f3f5ff",
              light: "#f9faff",
            },
          },
        },
      },
    }),
,],

})
