import type { ExplorerOptions } from "./.quartz/plugins"
import { componentRegistry } from "./quartz/components/registry"

const sortFn: ExplorerOptions["sortFn"] = (a, b) => {
  // Folders before files
  if (a.isFolder && !b.isFolder) return -1
  if (!a.isFolder && b.isFolder) return 1

  // Two folders: alphabetical
  if (a.isFolder && b.isFolder) {
    return (a.displayName ?? "").localeCompare(b.displayName ?? "", undefined, {
      numeric: true,
      sensitivity: "base",
    })
  }

  // Two files: newest creation date first
  const aDate = a.data?.date as string | undefined
  const bDate = b.data?.date as string | undefined
  if (aDate && bDate) return new Date(bDate).getTime() - new Date(aDate).getTime()
  if (aDate) return -1
  if (bDate) return 1

  // Fallback: alphabetical
  return (a.displayName ?? "").localeCompare(b.displayName ?? "", undefined, {
    numeric: true,
    sensitivity: "base",
  })
}

// Equivalent to the documented `ExternalPlugin.Explorer({...})`, which is currently a
// silent no-op: explorer 1.0's index.d.ts only re-exports, so regeneratePluginIndex
// doesn't detect it as overridable and exports the raw component instead of the wrapper.
componentRegistry.setOptionOverrides("explorer", { sortFn })

import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
const config = await loadQuartzConfig()
export default config
export const layout = await loadQuartzLayout()
