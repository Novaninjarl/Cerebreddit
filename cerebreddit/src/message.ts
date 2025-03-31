/** Message from Devvit to the web view. */
export type DevvitMessage =
  | { type: 'initialData'; data: { username: string } }
  | { type: 'textEmbeddingGenerated'; data: { embedding: number[] } }
  | { type: 'imageEmbeddingGenerated'; data: { embedding: number[] } }
  | { type: 'aiResponse'; data: { response: string } }
  | { type: 'similarCases'; data: { cases: any[] } }
  | { type: 'postExplanation'; data: { explanation: any } }
  | { type: 'modReplyGenerated'; data: { reply: any } }
  // New types for the dashboard messages:
  | { type: 'searchResults'; data: { results: any[] } }
  | { type: 'subredditInsight'; data: any }
  | { type: 'botAnalysis'; data: { botScore: number } }
  | { type: 'userAnalysis'; data: any }
  | { type: 'Found'; data:{id: string; }}
/** Message from the web view to Devvit. */
export type WebViewMessage =
  | { type: 'webViewReady' }
  | { type: 'generateTextEmbedding'; data: { text: string } }
  | { type: 'generateImageEmbedding'; data: { image: string } }
  | { type: 'storeEmbedding'; data: { id: string; text?: string; image?: string } }
  | { type: 'getAIResponse'; data: { query: string } }
  | { type: 'explainPost'; data: { postId?: string; text?: string } }
  | { type: 'autoModerate'; data: { text?: string; image?: string } }
  | { type: 'generateModReply'; data: { reportDetails: string } }
  | { type: 'searchPosts'; data: { query: string; image: string[] } }
  | { type: 'fetchSubredditInsight'; data: { subredditName: string }}
  | { type: 'BotMeter' ; data: { username: string } }
  | { type: 'analyzeUser'; data: { username: string } }
  | { type: 'PostExplanation';}
  | { type: 'ModReply';}
  | { type: 'FoundMatch'; data:{id: string; }}
  

/**
 * Message event listener data type.
 */
export type DevvitSystemMessage = {
  data: { message: DevvitMessage };
  type?: 'devvit-message' | string;
};
