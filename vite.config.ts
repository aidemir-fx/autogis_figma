import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import svgr from "vite-plugin-svgr";

export default defineConfig({
    base: "/",
    build: {
        target: "es2015",
        // SEO оптимизации
        rollupOptions: {
            output: {
                // Разделение кода для лучшей производительности
                manualChunks: {
                    vendor: ["react", "react-dom"],
                    ui: [
                        "@mui/material",
                        "@mui/x-date-pickers",
                        "@emotion/react",
                        "@emotion/styled",
                    ],
                    router: ["react-router-dom"],
                    query: ["@tanstack/react-query"],
                    maps: ["@pbe/react-yandex-maps"],
                    utils: ["axios", "dayjs", "yup"],
                },
                // Оптимизация имен файлов для SEO
                assetFileNames: (assetInfo) => {
                    const name = assetInfo.name || "asset";
                    const info = name.split(".");
                    const ext = info[info.length - 1];
                    if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
                        return `assets/images/[name]-[hash][extname]`;
                    }
                    if (/css/i.test(ext)) {
                        return `assets/css/[name]-[hash][extname]`;
                    }
                    if (/woff2?|eot|ttf|otf/i.test(ext)) {
                        return `assets/fonts/[name]-[hash][extname]`;
                    }
                    return `assets/[name]-[hash][extname]`;
                },
                chunkFileNames: "assets/js/[name]-[hash].js",
                entryFileNames: "assets/js/[name]-[hash].js",
            },
        },
        // Используем штатный esbuild, чтобы сборка не зависела от optional terser
        minify: "esbuild",
        esbuild: {
            drop: ["console", "debugger"],
        },
        // Предзагрузка критических ресурсов
        assetsInlineLimit: 4096,
    },
    plugins: [
        react({
            babel: {
                plugins: [
                    [
                        "babel-plugin-styled-components",
                        {
                            displayName: true,
                            fileName: false,
                        },
                    ],
                ],
            },
        }),
        svgr({
            svgrOptions: {
                exportType: "named",
                ref: true,
                svgo: false,
                titleProp: true,
            },
            include: "**/*.svg",
        }),
    ],
    resolve: {
        alias: {
            "@app": path.resolve(__dirname, "src/app"),
            "@screens": path.resolve(__dirname, "src/screens"),
            "@modules": path.resolve(__dirname, "src/modules"),
            "@common": path.resolve(__dirname, "src/common"),
        },
    },
    preview: {
        proxy: {
            "/api": {
                target: "http://localhost:3001",
                changeOrigin: true,
            },
            "/ws": {
                target: "ws://localhost:3001",
                changeOrigin: true,
                ws: true,
            },
        },
        host: "0.0.0.0",
        port: 5173,
        strictPort: true,
    },
    server: {
        allowedHosts: true,
        port: 5173,
        strictPort: true,
        proxy: {
            "/api": {
                target: "http://localhost:3001",
                changeOrigin: true,
            },
            "/ws": {
                target: "ws://localhost:3001",
                changeOrigin: true,
                ws: true,
            },
        },
    },
});
