// Global interface for Redis sorted set items
interface RedisItem {
	value: string;
	score: number;
  }
  interface CohereResponse {
	id: string;
	texts: string[];
	embeddings: {
	  float: number[][];
	};
	meta: {
	  api_version: { version: string };
	  billed_units: { input_tokens: number };
	};
	response_type: "embeddings_by_type";
  }
  
  

interface ChatCompletionResponse {
	choices: {
	  message: {
		content: string;
	  };
	}[];
  }
  
  interface JinaImageEmbeddingResponse {
	data: {
	  embedding: number[];
	}[];
  }
  
  export default {
	async fetch(request: Request, env: any): Promise<Response> {
	  const url = new URL(request.url);
	  const path = url.pathname;
  
	  // -------------------------------
	  // POST Endpoints
	  // -------------------------------
	  if (request.method === "POST") {
		const body = (await request.json()) as {
		  text?: string;
		  image?: string;
		  id?: string;
		  query?: string;
		  post_id?: string;
		  postText?: string;
		  title?: string;
		  content?: string;
		  flair?: string;
		  imageUrls?: string[];
		  action?: string;
		  reason?: string;
		  userId?: string;
		  taskType?: string;
		  scheduleTime?: string;
		  status?: string;
		  subredditName?: string;
		  metric?: string;
		  value?: number;
		  moderationCaseId?: string;
		  replyText?: string;
		  reportDetails?: string;
		  image_urls?:string[];
		  inputType:"search_document"| "search_query";
		};
  
		//  AI-Powered Search Without Keywords
		if (path === "/api/search") {
		  return new Response(
			JSON.stringify({
			  results: await searchWithOriginalContent(env, body.query!, body.image),
			}),
			{ headers: { "Content-Type": "application/json" } }
		  );
		}
		//  AI-Powered Search Without Keywords for matches
		if (path === "/api/search/matches") {
			return new Response(
			  JSON.stringify({
				results: await getMatches(env, body.query!, body.image),
			  }),
			  { headers: { "Content-Type": "application/json" } }
			);
		  }
  
		//  Explain Any Post Instantly
		if (path === "/api/explain_post") {
		  return new Response(
			JSON.stringify({ explanation: await explainPost(env, body.post_id, body.text) }),
			{ headers: { "Content-Type": "application/json" } }
		  );
		}
  
		//  Generate Image Embedding (for image search)
		if (path === "/api/generate_image_embedding") {
		  const imageBase64 = body.image ? await urlToBase64(body.image) : body.image;
		  return new Response(
			JSON.stringify({ embedding: await generateImageEmbedding(env, imageBase64!) }),
			{ headers: { "Content-Type": "application/json" } }
		  );
		}
  
		// Generate Text Embedding (for text search)
		if (path === "/api/generate_text_embedding") {
		  return new Response(
			JSON.stringify({ embedding: await generateTextEmbedding(env, body.text!,body.inputType) }),
			{ headers: { "Content-Type": "application/json" } }
		  );
		}
  
		// Store Embedding in Pinecone (for posts)
		if (path === "/api/store_embedding") {
		  await storeEmbedding(env, body.id!, body.text, body.image);
		  return new Response(
			JSON.stringify({ status: "Stored in Pinecone" }),
			{ headers: { "Content-Type": "application/json" } }
		  );
		}
		// Store a Post in Supabase
		if (path === "/api/store_post") {
		  const postId = await storePostInSupabase(
			env,
			body.id!,
			body.title!,
			body.content!,
			body.flair,
		    body.image_urls
		  );
		  return new Response(
			JSON.stringify({ postId }),
			{ headers: { "Content-Type": "application/json" } }
		  );
		}
  
		// Store a Moderation Case in Supabase
		if (path === "/api/store_moderation_case") {
		  const caseId = await storeModerationCaseInSupabase(
			env,
		    body.post_id!,
			body.action!,
			body.reason!
		  );
		  return new Response(
			JSON.stringify({ caseId }),
			{ headers: { "Content-Type": "application/json" } }
		  );
		}
  
		//  AI-Suggested Mod Replies – generate an AI-based mod reply using case details
		if (path === "/api/generate_mod_reply") {
		  if (!body.moderationCaseId) {
			return new Response("Missing moderationCaseId", { status: 400 });
		  }
		  const modReply = await generateModReply(env, body.moderationCaseId, body.reportDetails);
		  return new Response(
			JSON.stringify({ modReply }),
			{ headers: { "Content-Type": "application/json" } }
		  );
		}
  
		// AI-Driven Auto-Moderation – analyze post content for rule violations
		if (path === "/api/auto_moderate") {
		  if (!body.post_id || !body.content) {
			return new Response("Missing postId or content", { status: 400 });
		  }
		  const recommendation = await autoModeratePost(env, body.post_id, body.content);
		  return new Response(
			JSON.stringify({ recommendation }),
			{ headers: { "Content-Type": "application/json" } }
		  );
		}
		//  Context-Aware Moderation Helper – search past mod cases using embeddings
		if (path === "/api/search_mod_cases") {
		  if (!body.query) {
			return new Response("Missing query", { status: 400 });
		  }
		  const result = await searchModCases(env, body.query);
		  return new Response(
			JSON.stringify(result),
			{ headers: { "Content-Type": "application/json" } }
		  );
		}
  
		// Store Mod Case Embedding – store a mod case's text embedding in Pinecone
		if (path === "/api/store_mod_case_embedding") {
		  if (!body.moderationCaseId || !body.text) {
			return new Response("Missing moderationCaseId or text", { status: 400 });
		  }
		  await storeModCaseEmbedding(env, body.moderationCaseId, body.text);
		  return new Response(
			JSON.stringify({ status: "Mod case embedding stored" }),
			{ headers: { "Content-Type": "application/json" } }
		  );
		}
	  
	  }
  
	  return new Response("Invalid request", { status: 400 });
	},
  } satisfies ExportedHandler<Env>;
  // Semicolon added to ensure proper termination
  
  // ----------------------------------------------------------------
  // Smart Flair Assignment & AI-Suggested Mod Replies
  // ----------------------------------------------------------------
  
  // Legacy: AI-based flair suggestion using OpenAI
 async function assignFlair(env: any, postId: string, postText: string): Promise<string> {
  const systemMessage = "You are a Reddit flair classification system. Return only the most appropriate flair name for this post, nothing else.";
  const userMessage = `Post content: ${postText}\n\nSuggested flair:`;
  const input = `System: ${systemMessage}\nUser: ${userMessage}`;

  const response = await fetch("https://api-inference.huggingface.co/models/Qwen/QwQ-32B", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.HUGGINGFACE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "inputs": input,
      "parameters": {
        "max_new_tokens": 60,
        "temperature": 0.35,
        "top_p": 0.20
      }
    })
  });

  // Explicitly cast the JSON response type
  const data = await response.json() as { generated_text: string }[];

  // Retrieve the generated text
  let generated = data[0]?.generated_text || "";

  // Remove the input prompt if it's repeated in the output.
  if (generated.includes(input)) {
    generated = generated.replace(input, "").trim();
  }

  // Truncate the text to the last full stop.
  const lastPeriod = generated.lastIndexOf('.');
  if (lastPeriod !== -1) {
    generated = generated.substring(0, lastPeriod + 1).trim();
  }

  return generated;
}

  
  // New: Direct flair assignment via Reddit’s API
  async function setPostFlair(
	env: any,
	subreddit: string,
	post_id: string,
	flairText: string,
	flairTemplateId?: string
  ): Promise<string> {
	const apiUrl = `https://oauth.reddit.com/r/${subreddit}/api/selectflair`;
	const params = new URLSearchParams();
	params.append("api_type", "json");
	params.append("link", post_id);
	params.append("text", flairText);
	if (flairTemplateId) {
	  params.append("flair_template_id", flairTemplateId);
	}
	const response = await fetch(apiUrl, {
	  method: "POST",
	  headers: {
		"Content-Type": "application/x-www-form-urlencoded",
		Authorization: `Bearer ${env.REDDIT_ACCESS_TOKEN}`,
		"User-Agent": env.REDDIT_USER_AGENT || "CerebModAI/0.1",
	  },
	  body: params.toString(),
	});
	const data = await response.json();
	return JSON.stringify(data);
  }
  
  // New: Generate AI-based mod reply using OpenAI
  async function generateModReply(env: any, moderationCaseId: string, reportDetails?: string): Promise<string> {
	const prompt = `Generate a professional moderator reply for the following case details: ${reportDetails || "No details provided"}. Provide a clear and concise response that addresses the issue.`;
	return await queryAI(env, prompt);
  }
  
  // ----------------------------------------------------------------
  // AI-Driven Auto-Moderation
  // ----------------------------------------------------------------
  async function autoModeratePost(env: any, postId: string, postText: string): Promise<string> {
	const prompt = `Analyze the following post content and determine if it might violate subreddit rules. Provide a brief explanation of any potential issues and recommend moderator actions: "${postText}"`;
	return await queryAI(env, prompt);
  }
  
  // ----------------------------------------------------------------
  // Embedding & Search Functions
  // ----------------------------------------------------------------
  // This helper function encapsulates the embedding logic.
 
  async function generateTextEmbedding(env: any, text: string,   inputType: "search_document" | "search_query"): Promise<number[]> {
	const cohereEndpoint = "https://api.cohere.com/v2/embed"; 
  
	const payload = {
	  model: "embed-english-v3.0",
	  input_type: inputType,           
	  texts: [text],
	  embedding_types: ["float"]
	};
  
	const response = await fetch(cohereEndpoint, {
	  method: "POST",
	  headers: {
		"Authorization": `Bearer ${env.COHERE_API_KEY}`,
		"Content-Type": "application/json"
	  },
	  body: JSON.stringify(payload)
	});
  
	if (!response.ok) {
	  const errorText = await response.text();
	  throw new Error(`Cohere API error: ${errorText}`);
	}
	
		const result = await response.json() as any;
	const embedding = result?.embeddings?.float?.[0];

	if (!embedding) {
	throw new Error(`Unexpected Cohere response format: ${JSON.stringify(result)}`);
	}

	return embedding;
  }
  
  
  
  
  
  async function generateImageEmbedding(env: any, imageUrl: string): Promise<number[]> {
	const imageBase64 = await urlToBase64(imageUrl); // must include "data:image/jpeg;base64,..."
  
	const apiUrl = "https://api.cohere.com/v2/embed";

	const response = await fetch(apiUrl, {
	  method: "POST",
	  headers: {
		"accept": "application/json",
		"content-type": "application/json",
		"Authorization": `Bearer ${env.COHERE_API_KEY}`

	  },
	  body: JSON.stringify({
		model: "embed-english-v3.0",
		input_type: "image",
		embedding_types: ["float"],
		images: [imageBase64]
	  })
	});
  
	if (!response.ok) {
	  const errorText = await response.text();
	  console.error("Error generating image embedding from Cohere:", errorText);
	  throw new Error(`Cohere API error: ${response.status}`);
	}
  
	const result = await response.json() as any;
	const embedding = result?.embeddings?.float?.[0];

	if (!embedding) {
	throw new Error(`Unexpected Cohere response format: ${JSON.stringify(result)}`);
	}

	return embedding;
  }
  
  
  
  
  
  
  
  async function storeEmbedding(env: any, id: string, text?: string, image?: string): Promise<void> {
	if (text) {
	  const vector = await generateTextEmbedding(env, text,"search_document");
	  const response = await fetch("https://cerebreddit-memory-frofbv5.svc.aped-4627-b74a.pinecone.io/vectors/upsert", {
		method: "POST",
		headers: {
		  "Content-Type": "application/json",
		  "Api-Key": env.PINECONE_API_KEY
		},
		body: JSON.stringify({
		  vectors: [{ id, values: vector }],
		}),
	  });
  
	  if (!response.ok) {
		const errorText = await response.text();
		console.error("Error storing TEXT embedding in Pinecone:", errorText);
		throw new Error(`Text embedding store failed: ${response.status}`);
	  }
	}
  
	// If image exists, store separately
	if (image) {
	  await storeImageEmbeddings(env, id, image);
	}
  }
  
  async function storeImageEmbeddings(env: any, id: string, image: string): Promise<void> {
	const vector = await generateImageEmbedding(env, image);
	const response = await fetch("https://cerebreddit-image-memory-frofbv5.svc.aped-4627-b74a.pinecone.io/vectors/upsert", {
	  method: "POST",
	  headers: {
		"Content-Type": "application/json",
		"Api-Key": env.PINECONE_API_KEY
	  },
	  body: JSON.stringify({
		vectors: [{ id, values: vector }],
	  }),
	});
  
	if (!response.ok) {
	  const errorText = await response.text();
	  console.error("Error storing IMAGE embedding in Pinecone:", errorText);
	  throw new Error(`Image embedding store failed: ${response.status}`);
	}
  }
  
  
  async function searchWithOriginalContent(env: any, query?: string, image?: string): Promise<any> {
	const result = await getMatches(env, query, image);
	const matches = result.matches;
  
	if (!Array.isArray(matches) || matches.length === 0) {
	  return { message: "No similar content found." };
	}
  
	const enrichedMatches = await Promise.all(
	  matches.map(async (match: any) => {
		const originalContent = await fetchOriginalFromSupabase(env, match.id);
		return {
		  id: match.id,
		  originalContent: originalContent ?? "Content not available",
		  score: match.score ?? "Unknown"
		};
	  })
	);
  
	return { matches: enrichedMatches };
  }
  

  async function getMatches(env: any, query?: string, image?: string): Promise<any> {
	const vector = query
	  ? await generateTextEmbedding(env, query, "search_query")
	  : await generateImageEmbedding(env, image!);
  
	const pineconeResponse = query
	  ? await searchPinecone(env, vector, "cerebreddit-memory")
	  : await searchPinecone(env, vector, "cerebreddit-image-memory");
  
	  const matches = (pineconeResponse as any).matches;

	if (!Array.isArray(matches) || matches.length === 0) {
	  return { message: "No similar content found.", pineconeResponse };
	}

  
	return {matches};
  }
  
  async function fetchOriginalFromSupabase(env: any, id: string): Promise<string | undefined> {
	const response = await fetch(`${env.SUPABASE_URL}/rest/v1/posts?id=eq.${id}`, {
	  method: "GET",
	  headers: {
		"Content-Type": "application/json",
		apikey: env.SUPABASE_KEY,
		Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
	  },
	});
	const data: any[] = await response.json();
	return data.length > 0 ? data[0].content : undefined;
  }
  
  async function explainPost(env: any, post_id?: string, text?: string): Promise<string> {
	let postText = text;
	if (!postText && post_id) {
	  postText = await fetchOriginalFromSupabase(env, post_id);
	}
	if (!postText) {
	  return "Error: No post content available.";
	}
	return queryAI(env, `Explain this post in simple terms:\n\n"${postText}"`);
  }
  async function queryAI(env: any, question: string): Promise<string> {
	const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
	  method: "POST",
	  headers: {
		"Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
		"Content-Type": "application/json"
	  },
	  body: JSON.stringify({
		model: "deepseek/deepseek-r1:free",
		messages: [
		  {
			role: "user",
			content: question
		  }
		]
	  })
	});
  
	const data: any = await response.json();
  
	// Assuming OpenRouter returns OpenAI-compatible response structure
	const generated = data?.choices?.[0]?.message?.content || "";
  
	return generated.trim();
  }
  
  
  
  // ----------------------------------------------------------------
  // Context-Aware Moderation Helper – Search past mod cases using embeddings
  // ----------------------------------------------------------------
  async function fetchModerationCaseContent(env: any, id: string): Promise<string | undefined> {
	const response = await fetch(`${env.SUPABASE_URL}/rest/v1/moderation_cases?id=eq.${id}`, {
	  method: "GET",
	  headers: {
		"Content-Type": "application/json",
		apikey: env.SUPABASE_KEY,
		Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
	  },
	});
	const data: any[] = await response.json();
	// Assume the 'reason' field holds the description of the case.
	return data.length > 0 ? data[0].reason : undefined;
  }
  
  async function searchModCases(env: any, query: string): Promise<any> {
	const vector = await generateTextEmbedding(env, query,"search_query");
	// Search in the dedicated Pinecone index for mod cases
	const pineconeResponse = await searchPinecone(env, vector, "cerebreddit-modcases-memory");
	
	const matches = (pineconeResponse as any).matches;

	if (!Array.isArray(matches) || matches.length === 0) {
	  return { message: "No similar content found.", pineconeResponse };
	}
  
	const bestMatch = matches[0];
  
	if (!bestMatch || !bestMatch.id) {
	  return { message: "No match ID found in Pinecone result.", pineconeResponse };
	}
	const modCaseContent = await fetchModerationCaseContent(env, bestMatch.id);
	return {
		originalContent: modCaseContent ?? "Content not available",
		bestMatchScore: bestMatch?.score ?? "Unknown",
	  };
  }
  
  // ----------------------------------------------------------------
  // Scheduled Moderation Tasks
  // ----------------------------------------------------------------
  async function storeScheduledTaskInSupabase(
	env: any,
	taskType: string,
	scheduleTime: string,
	status: string
  ): Promise<string> {
	const response = await fetch(`${env.SUPABASE_URL}/rest/v1/scheduled_tasks`, {
	  method: "POST",
	  headers: {
		"Content-Type": "application/json",
		apikey: env.SUPABASE_KEY,
		Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
	  },
	  body: JSON.stringify({ task_type: taskType, schedule_time: scheduleTime, status }),
	});
	const data: { id: string } = await response.json();
	return data.id;
  }
  
  // ----------------------------------------------------------------
  // Real-Time Subreddit Insights – Return real-time subreddit metrics from Redis
  // ----------------------------------------------------------------
  async function fetchSubredditInsight(env: any): Promise<any> {
	// Get today's date in YYYY-MM-DD format
	const today = new Date().toISOString().split("T")[0];
  
	// Fetch daily post counts from Redis hash "subreddit:stats:posts"
	const postsStats = await env.redis.hGetAll("subreddit:stats:posts");
  
	// Fetch moderator actions for today from Redis hash "mod:actions:YYYY-MM-DD"
	const modActions = await env.redis.hGetAll(`mod:actions:${today}`);
  
	// Fetch top flagged users from a Redis sorted set
	const flaggedUsers = await env.redis.zRange("flagged:users", 0, 9, {
	  rev: true,
	  withScores: true,
	});
  
	// Additional Data: Subreddit basic info stored as JSON in Redis under key "subreddit:info"
	const subredditInfoStr = await env.redis.get("subreddit:info");
	const subredditInfo = subredditInfoStr ? JSON.parse(subredditInfoStr) : {};
  
	// Additional Data: Subreddit settings stored in Redis hash "subreddit:settings"
	const subredditSettings = await env.redis.hGetAll("subreddit:settings");
  
	// Additional content metrics (e.g., mod queue count, reports count, spam count)
	const modQueueCountStr = await env.redis.get("subreddit:modqueue:count");
	const reportsCountStr = await env.redis.get("subreddit:reports:count");
	const spamCountStr = await env.redis.get("subreddit:spam:count");
  
	const contentMetrics = {
	  modQueueCount: modQueueCountStr ? parseInt(modQueueCountStr) : 0,
	  reportsCount: reportsCountStr ? parseInt(reportsCountStr) : 0,
	  spamCount: spamCountStr ? parseInt(spamCountStr) : 0,
	};
  
	// Return a combined object with all metrics.
	return {
	  postsStats,
	  modActions,
	  flaggedUsers,
	  subredditInfo,
	  subredditSettings,
	  contentMetrics,
	};
  }
  
  // ----------------------------------------------------------------
  // Helper Functions
  // ----------------------------------------------------------------
  function base64ToUint8Array(base64: string): Uint8Array {
	// Split on the comma in case the base64 string has a data URI prefix
	const base64Str = base64.includes(",") ? base64.split(",")[1] : base64;
	const binaryString = atob(base64Str);
	const len = binaryString.length;
	const bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) {
	  bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes;
  }
	
  async function urlToBase64(url: string, mimeType: string = "image/jpeg"): Promise<string> {
	try {
	  const response = await fetch(url);
	  if (!response.ok) {
		throw new Error(`Failed to fetch image: ${response.statusText}`);
	  }
	  const buffer = await response.arrayBuffer();
	  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
	  return `data:${mimeType};base64,${base64}`;
	} catch (error) {
	  console.error("Error converting URL to Base64:", error);
	  throw error;
	}
  }
  
  // ----------------------------------------------------------------
  // Supabase CRUD Functions
  // ----------------------------------------------------------------
  async function storePostInSupabase(
	env: any,
	id: string,
	title: string,
	content: string,
	flair?: string,
	image_urls?: string[]
  ) {
	const response = await fetch(`${env.SUPABASE_URL}/rest/v1/posts`, {
	  method: "POST",
	  headers: {
		"Content-Type": "application/json",
		apikey: env.SUPABASE_KEY,
		Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
	  },
	  body: JSON.stringify({ id, title, content, flair, image_urls }),
	});
  
	if (!response.ok) {
	  const errorText = await response.text();
	  console.error("Error storing post in Supabase:", errorText);
	  throw new Error(`Store post API error: ${response.status}`);
	}
  }
  
  
  async function storeModerationCaseInSupabase(
	env: any,
	post_id: string,
	action: string,
	reason: string
  ) {
	const response = await fetch(`${env.SUPABASE_URL}/rest/v1/moderation_cases`, {
	  method: "POST",
	  headers: {
		"Content-Type": "application/json",
		apikey: env.SUPABASE_KEY,
		Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
	  },
	  body: JSON.stringify({ post_id, action, reason }),
	});
  
	if (!response.ok) {
	  const errorText = await response.text();
	  console.error("Error storing moderation case in Supabase:", errorText);
	  throw new Error(`Store moderation case API error: ${response.status}`);
	}
  }
  
 
  
  
  async function searchPinecone(
	env: any,
	vector: number[],
	indexName: string
  ): Promise<{ results: { id: string; metadata: any }[] }> {
	const indexHostMap: Record<string, string> = {
	  "cerebreddit-memory": "https://cerebreddit-memory-frofbv5.svc.aped-4627-b74a.pinecone.io",
	  "cerebreddit-image-memory": "https://cerebreddit-image-memory-frofbv5.svc.aped-4627-b74a.pinecone.io",
	  "cerebreddit-modcases-memory":"https://cerebreddit-modcases-memory-frofbv5.svc.aped-4627-b74a.pinecone.io"
	};
  
	const host = indexHostMap[indexName];
	if (!host) {
	  throw new Error(`No Pinecone host configured for index: ${indexName}`);
	}
  
	const response = await fetch(`${host}/query`, {
	  method: "POST",
	  headers: {
		"Content-Type": "application/json",
		"Api-Key": env.PINECONE_API_KEY
	  },
	  body: JSON.stringify({
		vector,
		topK: 5,
		includeMetadata: true,
	  }),
	});
  
	if (!response.ok) {
	  const errorText = await response.text();
	  throw new Error(`Pinecone query failed: ${errorText}`);
	}
  
	return await response.json();
  }
  // ----------------------------------------------------------------
  // New: Store Mod Case Embedding
  // ----------------------------------------------------------------
  async function storeModCaseEmbedding(env: any, modCaseId: string, caseText: string): Promise<void> {
	const vector = await generateTextEmbedding(env, caseText,"search_document");
	await fetch("https://api.pinecone.io/v1/upsert", {
	  method: "POST",
	  headers: { "Content-Type": "application/json", "Api-Key": env.PINECONE_API_KEY },
	  body: JSON.stringify({
		index: "cerebreddit-modcases-memory",
		vectors: [{ id: modCaseId, values: vector }],
	  }),
	});
  }
  
 
  