import fs from "node:fs";
import path from "node:path";

const PUBLIC_DIR = path.resolve("public");
const OUTPUT_DIR = path.resolve("src/modules/acceleration/data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "imageLibrary.ts");

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".svg",
]);

function scanDirectory(directory, relativePath = "") {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const entries = fs.readdirSync(directory, {
    withFileTypes: true,
  });

  const images = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    const entryRelativePath = path.join(relativePath, entry.name);

    if (entry.isDirectory()) {
      images.push(...scanDirectory(fullPath, entryRelativePath));
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();

    if (IMAGE_EXTENSIONS.has(extension)) {
      images.push(
        "/" + entryRelativePath.split(path.sep).join("/")
      );
    }
  }

  return images;
}

const images = scanDirectory(PUBLIC_DIR);

images.sort((a, b) => a.localeCompare(b, undefined, {
  numeric: true,
  sensitivity: "base",
}));

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const fileContent = `// AUTO-GENERATED FILE.
// Do not edit manually.
// Generated from the public/ directory.

export const IMAGE_LIBRARY = ${JSON.stringify(images, null, 2)} as const;
`;

fs.writeFileSync(OUTPUT_FILE, fileContent, "utf8");

console.log(
  `✓ Image library generated: ${images.length} image(s)`
);

if (images.length > 0) {
  images.forEach((image) => {
    console.log(`  - ${image}`);
  });
}
