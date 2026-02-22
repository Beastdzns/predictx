import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distDir = path.resolve(__dirname, '..', 'dist')

const manifestPath = path.join(distDir, 'manifest.json')

if (!fs.existsSync(manifestPath)) {
    console.log('No manifest.json found in dist, skipping fix')
    process.exit(0)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

// Fix content script paths
if (manifest.content_scripts) {
    manifest.content_scripts = manifest.content_scripts.map(cs => {
        if (cs.js) {
            cs.js = cs.js
                .filter(p => !p.startsWith('src/') || p.includes('injected'))
                .map(p => p.replace(/^src\/content\/content\.tsx$/, 'assets/content.js'))
        }
        if (cs.css) {
            cs.css = cs.css
                .filter(p => !p.startsWith('src/'))
                .map(p => p.replace(/^src\/content\/content\.css$/, 'assets/content.css'))
        }
        return cs
    })
}

// Fix web_accessible_resources
if (manifest.web_accessible_resources) {
    manifest.web_accessible_resources = manifest.web_accessible_resources.map(war => {
        if (war.resources) {
            war.resources = war.resources.map(r =>
                r.replace(/^src\/content\/injected\.js$/, 'src/content/injected.js')
            )
        }
        return war
    })
}

// Remove icons if they don't exist
if (manifest.icons) {
    const iconsExist = Object.values(manifest.icons).every(iconPath =>
        fs.existsSync(path.join(distDir, iconPath))
    )
    if (!iconsExist) {
        delete manifest.icons
        if (manifest.action) {
            delete manifest.action.default_icon
        }
        console.log('Removed non-existent icon references')
    }
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
console.log('Manifest fixed successfully')
