import type { StorybookConfig } from "@storybook/nextjs-vite"
import { fileURLToPath } from "node:url"
import { mergeConfig } from "vite"

const config: StorybookConfig = {
  stories: ["../stories/{boltz,swap}/**/*.stories.tsx"],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
  ],
  framework: "@storybook/nextjs-vite",
  staticDirs: ["../public"],
  async viteFinal(config) {
    return mergeConfig(config, {
      resolve: {
        alias: {
          "@/hooks/use-immortal-runtime": fileURLToPath(
            new URL("./mocks/use-immortal-runtime.ts", import.meta.url)
          ),
          "@/hooks/use-funded-regtest": fileURLToPath(
            new URL("./mocks/use-funded-regtest.ts", import.meta.url)
          ),
        },
      },
    })
  },
}
export default config
