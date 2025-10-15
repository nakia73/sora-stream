import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // ⚠️ 重要: GitHub Pagesで公開する場合、実際のリポジトリ名に変更してください
  // 例: リポジトリ名が 'my-sora-app' なら base: '/my-sora-app/'
  base: '/sora2-api-app/',
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
