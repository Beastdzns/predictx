#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Running postinstall script...');

// Copy privacycash dist folder from vendor to node_modules
const vendorDistPath = path.join(__dirname, '../vendor/privacycash-dist');
const nodeModulesPath = path.join(__dirname, '../node_modules/privacycash/dist');

if (fs.existsSync(vendorDistPath)) {
  console.log('Copying privacycash dist from vendor to node_modules...');
  
  // Ensure node_modules/privacycash exists
  const privacycashPath = path.join(__dirname, '../node_modules/privacycash');
  if (!fs.existsSync(privacycashPath)) {
    fs.mkdirSync(privacycashPath, { recursive: true });
  }
  
  // Copy the entire dist folder
  fs.cpSync(vendorDistPath, nodeModulesPath, { recursive: true, force: true });
  console.log('✓ privacycash dist copied successfully');
  
  // Copy package.json if exists
  const vendorPkgPath = path.join(vendorDistPath, 'package.json');
  const nodeModulesPkgPath = path.join(privacycashPath, 'package.json');
  if (fs.existsSync(vendorPkgPath)) {
    fs.copyFileSync(vendorPkgPath, nodeModulesPkgPath);
    console.log('✓ privacycash package.json copied');
  }
} else {
  console.warn('⚠ Warning: vendor/privacycash-dist not found');
}

// Copy WASM files from @lightprotocol/hasher.rs
const lightProtocolPath = path.join(__dirname, '../node_modules/@lightprotocol/hasher.rs');
if (fs.existsSync(lightProtocolPath)) {
  console.log('Copying WASM files for @lightprotocol/hasher.rs...');
  
  const wasmSourcePath = path.join(lightProtocolPath, 'dist');
  const wasmDestPath = path.join(lightProtocolPath, 'dist/browser-fat/es');
  
  if (!fs.existsSync(wasmDestPath)) {
    fs.mkdirSync(wasmDestPath, { recursive: true });
  }
  
  // Copy WASM files
  const wasmFiles = ['hasher_wasm_simd_bg.wasm', 'light_wasm_hasher_bg.wasm'];
  wasmFiles.forEach(file => {
    const sourcePath = path.join(wasmSourcePath, file);
    const destPath = path.join(wasmDestPath, file);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✓ Copied ${file}`);
      
      // Also copy to public for production
      const publicWasmPath = path.join(__dirname, '../public/wasm');
      if (!fs.existsSync(publicWasmPath)) {
        fs.mkdirSync(publicWasmPath, { recursive: true });
      }
      fs.copyFileSync(sourcePath, path.join(publicWasmPath, file));
    }
  });
  
  console.log('✓ WASM files copied successfully');
} else {
  console.warn('⚠ Warning: @lightprotocol/hasher.rs not found');
}

console.log('Postinstall complete!');
