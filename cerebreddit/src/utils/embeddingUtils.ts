export async function generateTextEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://cerebreddit-api.cerebreddit-api.workers.dev/api/generate_text_embedding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error(`Embedding API Error: ${response.status}`);
  const data = await response.json();
  return data.embedding;
}

export async function generateImageEmbedding(imageBase64: string): Promise<number[]> {
  const response = await fetch("https://cerebreddit-api.cerebreddit-api.workers.dev/api/generate_image_embedding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageBase64 }),
  });
  if (!response.ok) throw new Error(`Image Embedding API Error: ${response.status}`);
  const data = await response.json();
  return data.embedding;
}

export async function storeEmbedding(id: string, text?: string, image?: string): Promise<void> {
  const response = await fetch("https://cerebreddit-api.cerebreddit-api.workers.dev/api/store_embedding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, text, image }),
  });
  if (!response.ok) throw new Error(`Store Embedding API Error: ${response.status}`);
}

export async function searchEmbeddings(query?: string, image?: string): Promise<any> {
  const response = await fetch("https://cerebreddit-api.cerebreddit-api.workers.dev/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, image }),
  });
  if (!response.ok) throw new Error(`Search API Error: ${response.status}`);
  const data = await response.json();
  return data.results;
}

/**
 * Store mod case embedding for context-aware moderation.
 */
export async function storeModCaseEmbedding(modCaseId: string, caseText: string): Promise<void> {
  const response = await fetch("https://cerebreddit-api.cerebreddit-api.workers.dev/api/store_mod_case_embedding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ moderationCaseId: modCaseId, text: caseText }),
  });
  if (!response.ok) throw new Error(`Store Mod Case Embedding API Error: ${response.status}`);
}

/**
 * Store mod reply embedding.
 */
export async function storeModReplyEmbedding(modReplyId: string, replyText: string): Promise<void> {
  const response = await fetch("https://cerebreddit-api.cerebreddit-api.workers.dev/api/store_mod_reply_embedding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ moderationCaseId: modReplyId, replyText }),
  });
  if (!response.ok) throw new Error(`Store Mod Reply Embedding API Error: ${response.status}`);
}
