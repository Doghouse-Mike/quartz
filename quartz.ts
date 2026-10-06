import { componentRegistry } from "./quartz/components/registry"

type IndexedEntry = { date?: string | number | Date }
type FileTrieNode = {
  isFolder: boolean
  displayName?: string
  data: Record<string, unknown> | null
}

componentRegistry.setOptionOverrides("explorer", {
  sortFn: (a: FileTrieNode, b: FileTrieNode) => {
    // Folders before files
    if (a.isFolder && !b.isFolder) return -1
    if (!a.isFolder && b.isFolder) return 1

    const aName = a.displayName ?? ""
    const bName = b.displayName ?? ""

    // Two folders: alphabetical
    if (a.isFolder && b.isFolder) {
      return aName.localeCompare(bName, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    }

    // Two files: newest creation date first
    const aDate = (a.data as IndexedEntry | null)?.date
    const bDate = (b.data as IndexedEntry | null)?.date
    if (aDate && bDate) return new Date(bDate).getTime() - new Date(aDate).getTime()
    if (aDate) return -1
    if (bDate) return 1

    // Fallback: alphabetical
    return aName.localeCompare(bName, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  },
})

import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
const config = await loadQuartzConfig()
export default config
export const layout = await loadQuartzLayout()
