import * as ExternalPlugin from "./.quartz/plugins"

ExternalPlugin.Explorer({
  sortFn: (a, b) => {
    // Folders before files
    if (a.isFolder && !b.isFolder) return -1
    if (!a.isFolder && b.isFolder) return 1

    // Two folders: alphabetical
    if (a.isFolder && b.isFolder) {
      return a.displayName.localeCompare(b.displayName, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    }

    // Two files: newest creation date first
    const aDate = a.data?.date
    const bDate = b.data?.date
    if (aDate && bDate) return new Date(bDate).getTime() - new Date(aDate).getTime()
    if (aDate) return -1
    if (bDate) return 1

    // Fallback: alphabetical
    return a.displayName.localeCompare(b.displayName, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  },
})

import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
const config = await loadQuartzConfig()
export default config
export const layout = await loadQuartzLayout()
