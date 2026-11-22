import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const embedBase = process.env.VITE_EMBED_BASE || env.VITE_EMBED_BASE || '/';
    const isEmbed = embedBase !== '/';
    return {
        base: embedBase,
        server: {
            port: 3000,
            host: '0.0.0.0',
        },
        plugins: [
            react(),
            ...(!isEmbed ? [VitePWA({
                strategies: 'injectManifest',
                srcDir: '.',
                filename: 'sw.ts',
                registerType: 'autoUpdate',
                includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
                manifest: {
                    name: 'بطاح الأصلي - قطع غيار السيارات',
                    short_name: 'بطاح الأصلي',
                    description: 'متجر بطاح الأصلي لقطع غيار السيارات وإكسسواراتها',
                    theme_color: '#ffffff',
                    background_color: '#ffffff',
                    display: 'standalone',
                    orientation: 'portrait',
                    scope: '/',
                    start_url: '/',
                    icons: [
                        {
                            src: 'pwa-192x192.png',
                            sizes: '192x192',
                            type: 'image/png'
                        },
                        {
                            src: 'pwa-512x512.png',
                            sizes: '512x512',
                            type: 'image/png'
                        },
                        {
                            src: 'pwa-512x512.png',
                            sizes: '512x512',
                            type: 'image/png',
                            purpose: 'any maskable'
                        }
                    ],
                    lang: 'ar',
                    dir: 'rtl'
                }
            })] : []),
        ],
        define: {
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || env.API_KEY || ''),
            'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || env.API_KEY || ''),
            'process.env.FIREBASE_API_KEY': JSON.stringify(env.FIREBASE_API_KEY),
            'process.env.FIREBASE_AUTH_DOMAIN': JSON.stringify(env.FIREBASE_AUTH_DOMAIN),
            'process.env.FIREBASE_PROJECT_ID': JSON.stringify(env.FIREBASE_PROJECT_ID),
            'process.env.FIREBASE_STORAGE_BUCKET': JSON.stringify(env.FIREBASE_STORAGE_BUCKET),
            'process.env.FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.FIREBASE_MESSAGING_SENDER_ID),
            'process.env.FIREBASE_APP_ID': JSON.stringify(env.FIREBASE_APP_ID),
            'process.env.VITE_IMGBB_API_KEY': JSON.stringify(env.VITE_IMGBB_API_KEY)
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            }
        },
        build: {
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
                            return 'vendor-firebase';
                        }
                        if (
                            id.includes('node_modules/react/') ||
                            id.includes('node_modules/react-dom/') ||
                            id.includes('node_modules/zustand/')
                        ) {
                            return 'vendor-react';
                        }
                    }
                }
            }
        }
    };
});
