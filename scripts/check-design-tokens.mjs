import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const files = [
    "src/screens/main-page/MobileSearchExperience.tsx",
    "src/screens/master-details/mobileStyles.ts",
    "src/screens/master-details/MobileMasterProfile.tsx",
];

const violations = [];

for (const relativePath of files) {
    const filePath = path.join(root, relativePath);
    const source = fs.readFileSync(filePath, "utf8");

    for (const [index, line] of source.split("\n").entries()) {
        if (/(^|[^\w])#[0-9a-f]{3,8}\b/i.test(line)) {
            violations.push(`${relativePath}:${index + 1} — raw hex color`);
        }

        const cssRadius = line.match(/border-radius:\s*([^;]+)/i)?.[1]?.trim();
        if (cssRadius && !cssRadius.startsWith("var(--ds-radius-") && cssRadius !== "0") {
            violations.push(`${relativePath}:${index + 1} — non-token border-radius: ${cssRadius}`);
        }

        const jsRadius = line.match(/borderRadius:\s*["']([^"']+)["']/i)?.[1]?.trim();
        if (jsRadius && !jsRadius.startsWith("var(--ds-radius-") && jsRadius !== "0") {
            violations.push(`${relativePath}:${index + 1} — non-token borderRadius: ${jsRadius}`);
        }

        const shadow = line.match(/box-shadow:\s*([^;]+)/i)?.[1]?.trim();
        if (shadow && shadow !== "none" && !shadow.startsWith("var(--ds-shadow-")) {
            violations.push(`${relativePath}:${index + 1} — non-token box-shadow: ${shadow}`);
        }
    }
}

if (violations.length > 0) {
    console.error("Design token check failed:");
    console.error(violations.join("\n"));
    process.exit(1);
}

console.log(`Design token check passed for ${files.length} mobile files.`);
