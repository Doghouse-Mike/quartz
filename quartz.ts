import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import * as ExternalPlugin from "./.quartz/plugins"
 
// Advanced: pass callback functions that can't be expressed in YAML
ExternalPlugin.Explorer({
sortFn: (a, b) => {    
    // First, sort folders before files    
    if (a.isFolder && !b.isFolder) return -1    
    if (!a.isFolder && b.isFolder) return 1    
        
    // If both are folders, sort alphabetically    
    if (a.isFolder && b.isFolder) {    
      return a.displayName.localeCompare(b.displayName, undefined, {    
        numeric: true,    
        sensitivity: "base",    
      })    
    }    
        
    // If both are files, sort by creation date (newest first)  
    const aCreated = a.data?.date  // Changed from frontmatter.created  
    const bCreated = b.data?.date  // Changed from frontmatter.created  
        
    if (aCreated && bCreated) {    
      return new Date(bCreated).getTime() - new Date(aCreated).getTime()    
    }    
        
    // If only one has a creation date, prioritize it    
    if (aCreated && !bCreated) return -1    
    if (!aCreated && bCreated) return 1    
        
    // Fallback to alphabetical sorting    
    return a.displayName.localeCompare(b.displayName, undefined, {    
      numeric: true,    
      sensitivity: "base",    
})
 
const config = await loadQuartzConfig()
export default config
export const layout = await loadQuartzLayout()

const config = await loadQuartzConfig()
export default config
export const layout = await loadQuartzLayout()
