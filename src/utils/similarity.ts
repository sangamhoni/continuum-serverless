export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

export function findTopK(
  queryVector: number[],
  candidates: Array<{ id: string; vector: number[] }>,
  k: number,
  minScore: number = 0.5
): Array<{ id: string; score: number }> {
  const scored = candidates.map(c => ({
    id: c.id,
    score: cosineSimilarity(queryVector, c.vector),
  }));

  return scored
    .filter(s => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('vectors must have same length');
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

