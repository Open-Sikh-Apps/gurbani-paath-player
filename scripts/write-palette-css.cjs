require("tsx/cjs");

const fs = require("fs");
const path = require("path");

const { CSS_COLOR_TOKENS, palette } = require("../src/theme/colors.ts");

const OUTPUT = path.join(__dirname, "../src/theme/palette.generated.css");

function paletteCss() {
  const lines = CSS_COLOR_TOKENS.flatMap(([jsKey, cssName]) => [
    `    --color-${cssName}: ${palette.light[jsKey]};`,
    `    --color-${cssName}-dark: ${palette.dark[jsKey]};`,
  ]);

  return `/* Generated from src/theme/colors.ts. Do not edit. */\n@layer theme {\n  @theme {\n${lines.join("\n")}\n  }\n}\n`;
}

function writePaletteCss() {
  const next = paletteCss();
  const previous = fs.existsSync(OUTPUT)
    ? fs.readFileSync(OUTPUT, "utf8")
    : "";
  if (previous === next) {
    return;
  }
  fs.writeFileSync(OUTPUT, next);
}

module.exports = { writePaletteCss };

if (require.main === module) {
  writePaletteCss();
}
