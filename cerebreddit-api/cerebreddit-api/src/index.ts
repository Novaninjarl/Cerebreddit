export default {
	async fetch(request: Request, env: any): Promise<Response> {
	  const url = new URL(request.url);
	  const path = url.pathname;
  
	  if (request.method === "POST") {
		const body = await request.json() as { 
		  text?: string; 
		  image?: string; 
		  id?: string; 
		  query?: string; 
		  postId?: string; 
		  reportDetails?: string 
		};
  
		if (path === "/api/generate_text_embedding") {
		  return new Response(JSON.stringify({ embedding: await generateTextEmbedding(env, body.text!) }), {
			headers: { "Content-Type": "application/json" },
		  });
		}
  
		if (path === "/api/generate_image_embedding") {
		  return new Response(JSON.stringify({ embedding: await generateImageEmbedding(env, body.image!) }), {
			headers: { "Content-Type": "application/json" },
		  });
		}
  
		if (path === "/api/store_embedding") {
		  await storeEmbedding(env, body.id!, body.text, body.image);
		  return new Response(JSON.stringify({ status: "Stored in Pinecone" }), {
			headers: { "Content-Type": "application/json" },
		  });
		}
  
		if (path === "/api/search") {
		  return new Response(JSON.stringify({ results: await searchWithOriginalContent(env, body.query!, body.image) }), {
			headers: { "Content-Type": "application/json" },
		  });
		}
  
		if (path === "/api/explain_post") {
		  return new Response(JSON.stringify({ explanation: await explainPost(env, body.postId, body.text) }), {
			headers: { "Content-Type": "application/json" },
		  });
		}
	  }
  
	  return new Response("Invalid request", { status: 400 });
	},
  } satisfies ExportedHandler<Env>;
  
  /* ---------------------
	 Search With Original Content
  --------------------- */
  async function searchWithOriginalContent(env: any, query?: string, image?: string) {
	const vector = query ? await generateTextEmbedding(env, query) : await generateImageEmbedding(env, image!);
	const pineconeResponse: { results: { id: string; metadata: any }[] } = await searchPinecone(env, vector, "neuromod-memory");
  
	if (!pineconeResponse.results || pineconeResponse.results.length === 0) {
	  return { message: "No similar content found." };
	}
  
	const bestMatch = pineconeResponse.results[0];
  
	// Fetch original content from Supabase
	const originalContent = await fetchOriginalFromSupabase(env, bestMatch.id);
	return {
	  originalContent: originalContent ?? "Content not available",
	  bestMatchScore: bestMatch.metadata.score ?? "Unknown",
	};
  }
  
  /**
   * Fetches original post content from Supabase.
   */
  async function fetchOriginalFromSupabase(env: any, id: string): Promise<string | undefined> {
	const response = await fetch(`${env.SUPABASE_URL}/rest/v1/embeddings?id=eq.${id}`, {
	  method: "GET",
	  headers: {
		"Content-Type": "application/json",
		apikey: env.SUPABASE_KEY,
		Authorization: `Bearer ${env.SUPABASE_KEY}`,
	  },
	});
  
	const data: any[] = await response.json();
	
	// Fix: Return undefined instead of null
	return data.length > 0 ? data[0].text : undefined;
  }
  
  
  /* ---------------------
	 Explain Any Post
  --------------------- */
  async function explainPost(env: any, postId?: string, text?: string): Promise<string> {
	let postText = text;
	if (!postText && postId) {
	  postText = await fetchOriginalFromSupabase(env, postId);
	}
	if (!postText) {
	  return "Error: No post content available.";
	}
	return queryAI(env, `Explain this post in simple terms:\n\n"${postText}"`);
  }
  
  /* ---------------------
	 AI Query Helper
  --------------------- */
  async function queryAI(env: any, question: string): Promise<string> {
	const response = await fetch("https://api.openai.com/v1/chat/completions", {
	  method: "POST",
	  headers: {
		"Content-Type": "application/json",
		Authorization: `Bearer ${env.OPENAI_API_KEY}`,
	  },
	  body: JSON.stringify({
		model: "gpt-4",
		messages: [{ role: "system", content: "You simplify complex topics for Reddit users." }, { role: "user", content: question }],
	  }),
	});
  
	const data: { choices: { message: { content: string } }[] } = await response.json();
	return data.choices[0].message.content;
  }
  
  /* ---------------------
	 Embedding Functions
  --------------------- */
  async function generateTextEmbedding(env: any, text: string): Promise<number[]> {
	const response = await fetch("https://api.openai.com/v1/embeddings", {
	  method: "POST",
	  headers: {
		"Content-Type": "application/json",
		Authorization: `Bearer ${env.OPENAI_API_KEY}`,
	  },
	  body: JSON.stringify({ model: "llama-text-embed-v2", input: text }),
	});
  
	const data: { data: { embedding: number[] }[] } = await response.json();
	return data.data[0].embedding;
  }
  
  async function generateImageEmbedding(env: any, imageBase64: string): Promise<number[]> {
	const binaryData = base64ToUint8Array(imageBase64);
  
	const response = await fetch("https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32", {
	  method: "POST",
	  headers: {
		Authorization: `Bearer ${env.HUGGINGFACE_API_KEY}`,
		"Content-Type": "application/octet-stream",
	  },
	  body: binaryData,
	});
  
	const data: number[] = await response.json();
	return data;
  }
  
  /**
   * Stores an embedding in Pinecone.
   */
  async function storeEmbedding(env: any, id: string, text?: string, image?: string) {
	const vector = text ? await generateTextEmbedding(env, text) : await generateImageEmbedding(env, image!);
  
	await fetch("https://api.pinecone.io/v1/upsert", {
	  method: "POST",
	  headers: { "Content-Type": "application/json", "Api-Key": env.PINECONE_API_KEY },
	  body: JSON.stringify({ index: "neuromod-memory", vectors: [{ id, values: vector, metadata: { text } }] }),
	});
  }
  
  /* ---------------------
	 Search Pinecone Helper
  --------------------- */
  async function searchPinecone(env: any, vector: number[], indexName: string): Promise<{ results: { id: string; metadata: any }[] }> {
	const response = await fetch("https://api.pinecone.io/v1/query", {
	  method: "POST",
	  headers: { "Content-Type": "application/json", "Api-Key": env.PINECONE_API_KEY },
	  body: JSON.stringify({ index: indexName, vector, topK: 5, includeMetadata: true }),
	});
  
	return await response.json();
  }
  
  /**
   * Converts base64 to Uint8Array.
   */
  function base64ToUint8Array(base64: string): Uint8Array {
	const binaryString = atob(base64.split(",")[1]);
	const len = binaryString.length;
	const bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) {
	  bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes;
  }
  