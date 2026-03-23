import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        nau: {
          blue: '#003466',
          gold: '#FFC627',
        },
      },
    },
  },
  plugins: [],
}

export default config
