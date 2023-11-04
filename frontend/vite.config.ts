import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
	server: {
		port: 3000,
		https: false,
		proxy: {
			'/api': {
				target: 'http://localhost:5000',
				changeOrigin: true,
				ws: true,
				secure: false
			}
		}
	},
	resolve: {
		alias: [
			{
				find: 'src',
				replacement: '/src'
			}
		]
	}
})