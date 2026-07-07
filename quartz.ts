import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import * as ExternalPlugin from "./.quartz/plugins"

// 1. Load the base config first
const config = await loadQuartzConfig()

// 2. Find the Explorer plugin in the config and override it
const explorerPlugin = config.plugins.find(p => p.name === "Explorer")

if (explorerPlugin) {
  explorerPlugin.options = {
    ...explorerPlugin.options, // Keep existing options (title, folderClickBehavior, etc.)
    sortFn: (a, b) => {
      // Your logic here:
      if (a.isFolder && !b.isFolder) return -1
      if (!a.isFolder && b.isFolder) return 1

      if (a.isFolder && b.isFolder) {
        return a.displayName.localeCompare(b.displayName, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      }

      const aCreated = a.data?.dates?.created // Note: Verify this path for your data
      const bCreated = b.data?.dates?.created

      if (aCreated && bCreated) {
        return new Date(bCreated).getTime() - new Date(aCreated).getTime()
      }

      if (aCreated && !bCreated) return -1
      if (!aCreated && bCreated) return 1

      return a.displayName.localeCompare(b.displayName, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    },
  }
}

export default config
export const layout = await loadQuartzLayout()