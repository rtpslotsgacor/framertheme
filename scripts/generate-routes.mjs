import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const functionsDir = path.join(projectRoot, "functions");
const output = path.join(projectRoot, "lib", "generated-routes.js");

// Files that are Cloudflare/system endpoints, not normal public pages.
const excludedFiles = new Set([
  "index.js",
  "[slug].js",
  "sitemap.xml.js",
  "robots.txt.js",
  "rss.xml.js"
]);

// Dynamic/system route directories that should not become static sitemap URLs.
const excludedDirs = new Set([
  "api",
  "amp",
  "og",
  "kategori"
]);

function scan(dir, isRoot = false) {
  const routes = [];

  if (!fs.existsSync(dir)) return routes;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Only exclude these directories when they are directly under functions/.
      if (isRoot && excludedDirs.has(entry.name)) continue;
      routes.push(...scan(full, false));
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
    if (isRoot && excludedFiles.has(entry.name)) continue;

    // [slug].js and any other dynamic [param].js are not static URLs.
    if (/^\[[^\]]+\]\.js$/.test(entry.name)) continue;

    const relative = path.relative(functionsDir, full).replaceAll(path.sep, "/");
    let route = "/" + relative.replace(/\.js$/, "");

    // functions/tools/index.js => /tools
    route = route.replace(/\/index$/, "");

    if (route !== "/") routes.push(route);
  }

  return routes;
}

const routes = [...new Set(scan(functionsDir, true))].sort((a, b) => a.localeCompare(b));

const source = [
  "// AUTO-GENERATED during build. Do not edit manually.",
  "// Source: functions/**/*.js",
  `export const STATIC_ROUTES = ${JSON.stringify(routes, null, 2)};`,
  ""
].join("\n");

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, source, "utf8");

console.log(`Generated ${routes.length} static sitemap routes.`);
for (const route of routes) console.log(`  ${route}`);
