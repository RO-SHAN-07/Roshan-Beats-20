const fs = require('fs');
const path = require('path');
const { minify } = require('html-minifier-terser');
const csso = require('csso');
const sharp = require('sharp');

const distDir = path.join(__dirname, '..', 'dist');

async function optimizeAssets() {
  console.log('🚀 Starting asset optimization...');

  try {
    // Minify HTML files
    await minifyHTML();

    // Minify CSS files
    await minifyCSS();

    // Optimize images
    await optimizeImages();

    // Generate compression manifest
    await generateCompressionManifest();

    console.log('✅ Asset optimization completed!');
  } catch (error) {
    console.error('❌ Asset optimization failed:', error);
    process.exit(1);
  }
}

async function minifyHTML() {
  console.log('📄 Minifying HTML files...');

  const htmlFiles = findFiles(distDir, '.html');

  for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const minified = await minify(content, {
      collapseWhitespace: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,
      minifyCSS: true,
      minifyJS: true
    });

    fs.writeFileSync(file, minified);
    console.log(`  ✓ Minified ${path.relative(distDir, file)}`);
  }
}

async function minifyCSS() {
  console.log('🎨 Minifying CSS files...');

  const cssFiles = findFiles(distDir, '.css');

  for (const file of cssFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const minified = csso.minify(content).css;

    fs.writeFileSync(file, minified);
    console.log(`  ✓ Minified ${path.relative(distDir, file)}`);
  }
}

async function optimizeImages() {
  console.log('🖼️  Optimizing images...');

  const imageFiles = findFiles(distDir, /\.(jpg|jpeg|png|gif|svg)$/i);

  for (const file of imageFiles) {
    const ext = path.extname(file).toLowerCase();

    try {
      if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        // Convert to WebP and create responsive versions
        const webpPath = file.replace(/\.(jpg|jpeg|png)$/i, '.webp');

        await sharp(file)
          .webp({ quality: 85 })
          .toFile(webpPath);

        // Create responsive sizes
        const sizes = [320, 640, 1024];
        for (const size of sizes) {
          const resizedPath = file.replace(/\.(jpg|jpeg|png)$/i, `-${size}w.webp`);
          await sharp(file)
            .resize(size, null, { withoutEnlargement: true })
            .webp({ quality: 85 })
            .toFile(resizedPath);
        }

        console.log(`  ✓ Optimized ${path.relative(distDir, file)}`);
      }
    } catch (error) {
      console.warn(`  ⚠️  Failed to optimize ${path.relative(distDir, file)}:`, error.message);
    }
  }
}

function findFiles(dir, pattern) {
  const files = [];

  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (stat.isFile()) {
        if (typeof pattern === 'string' && item.endsWith(pattern)) {
          files.push(fullPath);
        } else if (pattern instanceof RegExp && pattern.test(item)) {
          files.push(fullPath);
        }
      }
    }
  }

  traverse(dir);
  return files;
}

async function generateCompressionManifest() {
  console.log('📋 Generating compression manifest...');

  const manifest = {
    generated: new Date().toISOString(),
    optimizations: {
      html: 'Minified with html-minifier-terser',
      css: 'Minified with csso',
      images: 'Converted to WebP, responsive sizes generated',
      js: 'Minified by Parcel/Terser'
    },
    recommendations: [
      'Enable gzip/brotli compression on server',
      'Set appropriate cache headers',
      'Use CDN for static assets',
      'Enable HTTP/2 server push for critical resources'
    ]
  };

  fs.writeFileSync(
    path.join(distDir, 'optimization-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log('  ✓ Generated optimization manifest');
}

optimizeAssets();