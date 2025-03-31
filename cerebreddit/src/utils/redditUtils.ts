const baseURL = "https://cerebreddit-api.cerebreddit-api.workers.dev";

/**
 * Returns the current subreddit via the provided Reddit context.
 */
export async function getCurrentSubreddit(context: any): Promise<any> {
  return await context.reddit.getCurrentSubreddit();
}

/**
 * Submits a post via the provided Reddit context.
 */
export async function submitPost(context: any, title: string, content: string): Promise<any> {
  return await context.reddit.submitPost({ title, content });
}

/**
 * Retrieves the moderation history via the provided Reddit context.
 */
export async function getModerationHistory(context: any): Promise<any> {
  return await context.reddit.getModerationHistory();
}

/**
 * Sets the post flair by calling the /api/set_post_flair endpoint.
 * @param subredditName - The subreddit where the post is located.
 * @param postId - The ID of the post.
 * @param flair - The flair text to assign.
 * @param flairTemplateId - (Optional) A flair template ID.
 */
export async function setPostFlair(
  subredditName: string,
  postId: string,
  flair: string,
  flairTemplateId?: string
): Promise<any> {
  const payload: any = { subredditName, postId, flair };
  if (flairTemplateId) payload.id = flairTemplateId;
  const response = await fetch(`${baseURL}/api/set_post_flair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Set Post Flair API Error: ${response.status}`);
  return await response.json();
}

/**
 * Stores a post in Supabase by calling the /api/store_post endpoint.
 * @param title - Post title.
 * @param content - Post content.
 * @param flair - (Optional) Post flair.
 * @param imageUrls - (Optional) Array of image URLs.
 */
export async function storePost(
  title: string,
  content: string,
  flair?: string,
  imageUrls?: string[]
): Promise<string> {
  const payload = { title, content, flair, imageUrls };
  const response = await fetch(`${baseURL}/api/store_post`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Store Post API Error: ${response.status}`);
  const data = await response.json();
  return data.postId;
}

/**
 * Stores a moderation case in Supabase by calling the /api/store_moderation_case endpoint.
 * @param postId - ID of the post that was moderated.
 * @param action - The moderation action taken.
 * @param reason - The reason for the action.
 */
export async function storeModerationCase(
  postId: string,
  action: string,
  reason: string
): Promise<string> {
  const payload = { postId, action, reason };
  const response = await fetch(`${baseURL}/api/store_moderation_case`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Store Moderation Case API Error: ${response.status}`);
  const data = await response.json();
  return data.caseId;
}

/**
 * Stores a moderator reply in Supabase by calling the /api/store_mod_reply endpoint.
 * @param moderationCaseId - The ID of the moderation case.
 * @param replyText - The moderator's reply.
 */
export async function storeModReply(
  moderationCaseId: string,
  replyText: string
): Promise<string> {
  const payload = { moderationCaseId, replyText };
  const response = await fetch(`${baseURL}/api/store_mod_reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Store Mod Reply API Error: ${response.status}`);
  const data = await response.json();
  return data.replyId;
}

/**
 * Schedules a moderation task by calling the /api/schedule_task endpoint.
 * @param taskType - Type of task.
 * @param scheduleTime - Time at which to schedule the task.
 * @param status - Task status.
 */
export async function scheduleTask(
  taskType: string,
  scheduleTime: string,
  status: string
): Promise<string> {
  const payload = { taskType, scheduleTime, status };
  const response = await fetch(`${baseURL}/api/schedule_task`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Schedule Task API Error: ${response.status}`);
  const data = await response.json();
  return data.taskId;
}

/**
 * Fetches live subreddit insights (real-time metrics) from the API.
 */
export async function fetchSubredditInsight(): Promise<any> {
  const response = await fetch(`${baseURL}/api/fetch_subreddit_insight`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error(`Fetch Subreddit Insight API Error: ${response.status}`);
  return await response.json();
}

/**
 * Fetches potential bot analysis data from the API.
 */
export async function fetchBotAnalysis(): Promise<any> {
  const response = await fetch(`${baseURL}/api/fetch_bot_analysis`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error(`Fetch Bot Analysis API Error: ${response.status}`);
  return await response.json();
}

/**
 * Fetches repeat offenders data from the API.
 */
export async function fetchRepeatOffenders(): Promise<any> {
  const response = await fetch(`${baseURL}/api/fetch_repeat_offenders`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error(`Fetch Repeat Offenders API Error: ${response.status}`);
  return await response.json();
}

/**
 * Fetches moderation cases from Supabase via the API.
 */
export async function fetchModCases(): Promise<any> {
  const response = await fetch(`${baseURL}/api/fetch_mod_cases`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error(`Fetch Mod Cases API Error: ${response.status}`);
  return await response.json();
}

/**
 * Fetches moderator replies from Supabase via the API.
 */
export async function fetchModReplies(): Promise<any> {
  const response = await fetch(`${baseURL}/api/fetch_mod_replies`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error(`Fetch Mod Replies API Error: ${response.status}`);
  return await response.json();
}

/**
 * Fetches subreddit insights directly from Supabase via the API.
 */
export async function fetchSubredditInsightSupabase(): Promise<any> {
  const response = await fetch(`${baseURL}/api/fetch_subreddit_insight_supabase`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok)
    throw new Error(`Fetch Subreddit Insight (Supabase) API Error: ${response.status}`);
  return await response.json();
}

/**
 * Analyzes user behavior by calling the /api/analyze_user_behavior endpoint.
 * @param userId - The ID (username) of the user to analyze.
 */
export async function analyzeUserBehavior(userId: string): Promise<any> {
  if (!userId) {
    throw new Error("Missing userId");
  }
  const payload = { userId };
  const response = await fetch(`${baseURL}/api/analyze_user_behavior`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Analyze User Behavior API Error: ${response.status}`);
  return await response.json();
}
