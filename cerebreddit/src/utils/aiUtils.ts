export async function queryAI(endpoint: string, payload: any): Promise<string> {
  const response = await fetch(`https://cerebreddit-api.cerebreddit-api.workers.dev/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const data = await response.json();
  return data.result || data.explanation || data.modReply || data.recommendation;
}

/**
 * AI Auto-Moderation – analyze post content for potential rule violations.
 * Expects both a postId and the post content.
 */
export async function autoModerate(postId: string, content: string): Promise<string> {
  if (!postId || !content) {
    throw new Error("Missing postId or content");
  }
  return await queryAI("api/auto_moderate", { postId, content });
}

/**
 * AI-Suggested Mod Replies – generate an AI-based mod reply using case details.
 * Requires a moderationCaseId and optionally additional report details.
 */
export async function generateModReply(moderationCaseId: string, reportDetails?: string): Promise<string> {
  if (!moderationCaseId) {
    throw new Error("Missing moderationCaseId");
  }
  return await queryAI("api/generate_mod_reply", { moderationCaseId, reportDetails });
}


/**
 * Explain a Post – returns an explanation via AI.
 * Either a postId or the raw text must be provided.
 */
export async function explainPost(postId?: string, text?: string): Promise<string> {
  if (!postId && !text) {
    throw new Error("Either postId or text must be provided");
  }
  return await queryAI("api/explain_post", { postId, text });
}
