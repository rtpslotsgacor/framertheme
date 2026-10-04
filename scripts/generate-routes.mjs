import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const functionsDir = path.resolve(root, "../functions");
const output = path.resolve(root, "../lib/generated-routes.js");

const excluded = new Set([
  "index.js",
  "[slug].js",
  "sitemap.xml.js",
  "robots.txt.js",
  "rss.xml.js"
]);

const excludedDirs = new Set(["api", "amp", "og", "kategori"]);

function scan(dir) {
  const routes = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (dir === functionsDir && excludedDirs.has(entry.name)) continue;
      routes.push(...scan(full));
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
    if (dir === functionsDir && excluded.has(entry.name)) continue;
    if (entry.name.startsWith("[") && entry.name.endsWith("].js")) continue;

    const relative = path.relative(functionsDir, full).replaceAll(path.sep, "/");
    const route = "/" + relative.replace(/\.js$/, "").replace(/\/index$/, "");
    if (route !== "/") routes.push(route);
  }
  return routes;
}

const routes = [...new Set(scan(functionsDir))].sort();

const source = `// AUTO-GENERATED. Do not edit manually.\nexport const STATIC_ROUTES = ${JSON.stringify(routes, null, 2)};\n`;
fs.writeFileSync(output, source, "utf8");
console.log(`Generated ${routes.length} static routes: ${routes.join(", ")}`);
