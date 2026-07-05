import { useMemo } from "react";
import { Text, View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { useTheme } from "@/lib/theme/context";

interface MathTextProps {
  content: string;
  style?: any;
}

const KATEX_CSS = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
const KATEX_JS = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js";

function buildHtml(content: string, isDark: boolean): string {
  const bg = isDark ? "#1a1040" : "#ffffff";
  const fg = isDark ? "#e2e8f0" : "#0f172a";
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="${KATEX_CSS}">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body {
  background: ${bg}; color: ${fg};
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 15px; line-height: 1.6; padding: 0 2px;
  direction: auto;
}
.katex { color: ${fg}; }
.katex-display { margin: 4px 0; text-align: center; overflow-x: auto; overflow-y: hidden; }
.katex .mathnormal { font-style: normal; }
p { margin: 0; }
</style>
</head><body>
<div id="root">${escapeHtml(content)}</div>
<script src="${KATEX_JS}"></script>
<script>
document.addEventListener("DOMContentLoaded", function() {
  document.querySelectorAll(".math, .math-inline").forEach(function(el) {
    try { katex.render(el.textContent, el, { displayMode: el.classList.contains("math"), throwOnError: false }); } catch(e) {}
  });
});
</script>
</body></html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hasMath(content: string): boolean {
  return /\$.+?\$/s.test(content);
}

/** Render inline math $...$ and display math $$...$$ in KaTeX via WebView. */
export default function MathText({ content, style }: MathTextProps) {
  const { mode } = useTheme();
  const isDark = mode === "dark";

  const html = useMemo(() => {
    if (!hasMath(content)) return null;
    // Convert $$...$$ -> <div class="math">...</div>
    // Convert $...$ -> <span class="math-inline">...</span>
    const processed = content
      .replace(/\$\$(.*?)\$\$/gs, '<div class="math">$1</div>')
      .replace(/\$(.*?)\$/g, '<span class="math-inline">$1</span>')
      .replace(/\n/g, "<br/>");
    return buildHtml(processed, isDark);
  }, [content, isDark]);

  if (!html) {
    return <Text style={style}>{content}</Text>;
  }

  // Inline height guess: one line if short, auto-growing if multi
  const lineCount = Math.min(content.split("\n").length, 6);

  return (
    <View style={style}>
      <WebView
        source={{ html }}
        style={{ height: Math.max(32, lineCount * 26), backgroundColor: "transparent" }}
        scrollEnabled={false}
        bounces={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        opaque={false}
      />
    </View>
  );
}
