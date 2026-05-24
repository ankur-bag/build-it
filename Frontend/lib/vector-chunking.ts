const sentenceSplitRegex = /(?<=[.!?])\s+/;

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function countWords(text: string) {
  if (!text) {
    return 0;
  }

  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function splitIntoSentences(text: string) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(sentenceSplitRegex)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function chunkTextBySentence(text: string, maxWords = 500) {
  const sentences = splitIntoSentences(text);
  const chunks: string[] = [];
  let current: string[] = [];
  let currentWords = 0;

  for (const sentence of sentences) {
    const sentenceWords = countWords(sentence);

    if (current.length > 0 && currentWords + sentenceWords > maxWords) {
      chunks.push(current.join(" "));
      current = [sentence];
      currentWords = sentenceWords;
      continue;
    }

    current.push(sentence);
    currentWords += sentenceWords;
  }

  if (current.length > 0) {
    chunks.push(current.join(" "));
  }

  return chunks;
}
