import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    // TZ bug'ının canlı testte tekrar kaçmaması için sunucuyu UTC farz et.
    // Fonksiyonlar zaten now'ı parametre aldığından sonuç TZ'den bağımsız olmalı.
    environment: "node",
  },
})
