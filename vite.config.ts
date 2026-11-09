import { defineConfig } from "vite";
import { bookDevPlugin } from "./scripts/lib/vite-plugin";

export default defineConfig({
  appType: "custom",
  server: {
    host: process.env.HOST ?? "127.0.0.1",
    port: Number(process.env.PORT ?? 5173),
    strictPort: false,
    open: false,
  },
  plugins: [bookDevPlugin()],
});
