import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MINOR_WORDS = new Set([
  "a", "an", "the", "and", "but", "or", "for", "nor",
  "at", "by", "from", "in", "of", "on", "to", "up",
  "with", "as", "into", "over", "onto", "per", "vs",
]);

export function toTitleCase(input: string): string {
  if (!input) return input;
  return input
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word, index) => {
      if (!word) return word;
      // Preserve acronyms (all uppercase, 2+ chars)
      if (word.length >= 2 && word === word.toUpperCase() && /^[A-Z]+$/.test(word)) {
        return word;
      }
      const lower = word.toLowerCase();
      if (index !== 0 && MINOR_WORDS.has(lower.replace(/[^a-z]/g, ""))) {
        // Keep hyphenated parts capitalized if significant
        if (word.includes("-")) {
          return word
            .split("-")
            .map((part, i) =>
              i === 0 && MINOR_WORDS.has(part.toLowerCase())
                ? part.toLowerCase()
                : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            )
            .join("-");
        }
        return lower;
      }
      // Handle hyphenated words
      if (word.includes("-")) {
        return word
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join("-");
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}
