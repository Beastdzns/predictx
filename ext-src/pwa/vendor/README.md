# Vendor Directory

This directory contains vendored dependencies that need to be version-controlled because they're not properly built or distributed in npm.

## privacycash-dist

The `privacycash-dist` folder contains the built distribution files for the `privacycash` package from GitHub (Privacy-Cash/privacy-cash-sdk).

**Why vendored?**
- The package on GitHub doesn't include pre-built dist files
- Building it from source has dependency issues
- We copy these files during `postinstall` to `node_modules/privacycash/dist/`

**Source:** Copied from privacy-payments-links project's node_modules

**Update process:**
If the privacycash SDK is updated, you'll need to:
1. Build/obtain the new dist files from the privacy-payments project
2. Copy them to this vendor directory
3. Commit the changes

## Postinstall Script

The `scripts/postinstall.js` automatically copies these files to node_modules after `npm install` or `pnpm install`, ensuring they're available in production deployments.
