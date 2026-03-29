import type { Page } from 'playwright';
import type { Check } from '../types';

/**
 * Check A: Spelling, grammar, and mixed language detection.
 *
 * TODO v2: Integrate LanguageTool API or similar for accurate grammar checking.
 *
 * V1 heuristic approach:
 * - Detect obvious repeated words (e.g. "the the")
 * - Detect suspicious character patterns (e.g. ALL_CAPS blocks, random symbols)
 * - Detect mixed-script text blocks (Latin mixed with Cyrillic/Arabic/etc.)
 * - Flag placeholder text (Lorem ipsum)
 *
 * Confidence: LOW — this is intentionally a heuristic module.
 */
export async function checkSpelling(page: Page): Promise<Check> {
  const issues = await page.evaluate(() => {
    const problems: Array<{ text: string; note: string }> = [];

    const LOREM = /lorem\s+ipsum/i;
    const REPEATED_WORD = /\b(\w{3,})\s+\1\b/i;
    // Latin chars mixed with non-latin scripts (Cyrillic, Arabic, Hebrew, CJK)
    const MIXED_SCRIPT = /[a-zA-Z]{3,}[\u0400-\u04FF\u0600-\u06FF\u0590-\u05FF\u4E00-\u9FFF]/;
    const PLACEHOLDER = /\[.*?\]|\{\{.*?\}\}|#\w+#/;

    const textEls = Array.from(
      document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, span')
    );

    for (const el of textEls) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;

      const text = el.textContent?.trim() ?? '';
      if (text.length < 8) continue;

      if (LOREM.test(text)) {
        problems.push({ text: text.slice(0, 100), note: 'Lorem ipsum placeholder text detected' });
      } else if (REPEATED_WORD.test(text)) {
        const match = text.match(REPEATED_WORD);
        problems.push({ text: text.slice(0, 100), note: `Repeated word: "${match?.[0]}"` });
      } else if (MIXED_SCRIPT.test(text)) {
        problems.push({ text: text.slice(0, 100), note: 'Possible mixed-script text (different character sets)' });
      } else if (PLACEHOLDER.test(text)) {
        problems.push({ text: text.slice(0, 100), note: 'Possible placeholder or template variable text' });
      }

      if (problems.length >= 10) break;
    }

    return problems;
  });

  if (issues.length === 0) {
    return {
      id: 'spelling',
      name: 'Spelling / grammar / mixed language',
      status: 'pass',
      summary: 'No obvious spelling, placeholder, or mixed-language issues detected. (Heuristic — low confidence)',
      confidence: 0.3,
    };
  }

  return {
    id: 'spelling',
    name: 'Spelling / grammar / mixed language',
    status: 'warning',
    summary: `${issues.length} potential content issue(s) flagged. Manual review recommended. (Heuristic — low confidence)`,
    details: issues.map((i) => ({ text: i.text, note: i.note })),
    confidence: 0.3,
  };
}
