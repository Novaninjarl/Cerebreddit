import { Devvit, useState, useWebView, Context } from '@devvit/public-api';
import type { DevvitMessage, WebViewMessage } from './message.js';
declare const window: any;

import { 
  storeEmbedding, 
  searchEmbeddings, 
  storeModCaseEmbedding, 
  storeModReplyEmbedding 
} from './utils/embeddingUtils.js';
import { 
  explainPost, 
  generateModReply, 
} from './utils/aiUtils.js';
import { getCurrentSubreddit, submitPost, getModerationHistory } from './utils/redditUtils.js';

/* ------------------------------------------------------
   Redis Utility Functions
---------------------------------------------------------*/

interface RedisZItem {
  member: string;
  score: number;
}
interface PostsStats {
  [date: string]: number;
}

interface ModActions {
  [actionType: string]: number;
}

interface FlaggedUser {
  member: string;
  score: number;
}

interface SubredditBasicInfo {
  name: string;
  subscribersCount: number;
  createdAt: number|Date
  description: string | null; // Allow null values
}

interface SubredditSettings {
  isPostingRestricted: boolean;
  isCommentingRestricted: boolean;
  type: string | null; // Allow null values
  isNsfw: boolean;
}

interface ContentMetrics {
  modQueueCount: number;
  reportsCount: number;
  spamCount: number;
}

interface SubredditInsight {
  postsStats: PostsStats;
  modActions: ModActions;
  flaggedUsers: FlaggedUser[];
  subredditInfo: SubredditBasicInfo;
  subredditSettings: SubredditSettings;
  contentMetrics: ContentMetrics;
}
async function fetchSubredditInsight(context: any, subredditName: string): Promise<SubredditInsight> {
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];
  
  // Initialize default return values
  let postsStats: PostsStats = {};
  let modActions: ModActions = {};
  let flaggedUsers: FlaggedUser[] = [];
  let subredditBasicInfo: SubredditBasicInfo = {
    name: subredditName,
    subscribersCount: 0,
    createdAt: new Date(),
    description: null
  };
  let settings: SubredditSettings = {
    isPostingRestricted: false,
    isCommentingRestricted: false,
    type: null,
    isNsfw: false
  };
  let contentMetrics: ContentMetrics = {
    modQueueCount: 0,
    reportsCount: 0,
    spamCount: 0
  };
  
  try {
    // Get current subreddit information
    const subredditInfo = await context.reddit.getSubredditInfoByName(subredditName);
    
    if (subredditInfo) {
      subredditBasicInfo = {
        name: subredditInfo.name || subredditName,
        subscribersCount: subredditInfo.subscribersCount || 0,
        createdAt: subredditInfo.createdAt || new Date(),
        description: subredditInfo.description || null
      };
      
      settings = {
        isPostingRestricted: subredditInfo.isPostingRestricted || false,
        isCommentingRestricted: subredditInfo.isCommentingRestricted || false,
        type: subredditInfo.type || null,
        isNsfw: subredditInfo.isNsfw || false
      };
      
      // Store subreddit basic info in Redis
      await context.redis.set("subreddit:info", JSON.stringify(subredditBasicInfo));
      
      // Store subreddit settings in Redis
      await context.redis.hSet("subreddit:settings", settings);
    }
  } catch (error) {
    console.error("Error fetching subreddit info:", error);
  }
  
  try {
    // Fetch recent posts to analyze post statistics
    const recentPosts = await context.reddit.getNewPosts({
      subredditName: subredditName,
      limit: 100
    });
    
    // Check if recentPosts is iterable before using for...of
    if (recentPosts && Array.isArray(recentPosts)) {
      // Process posts data to create postsStats
      for (const post of recentPosts) {
        if (post && post.createdAt) {
          const postDate = new Date(post.createdAt).toISOString().split("T")[0];
          postsStats[postDate] = (postsStats[postDate] || 0) + 1;
        }
      }
      
      // Store this data in Redis for future reference
      await context.redis.hSet("subreddit:stats:posts", postsStats);
    } else {
      console.log("Recent posts data is not an array or is empty");
    }
  } catch (error) {
    console.error("Error fetching recent posts:", error);
  }
  
  try {
    // Try to get moderation actions if user has permissions
    const modLog = await context.reddit.getModerationLog({
      subredditName: subredditName,
      limit: 50
    });
    
    if (modLog && Array.isArray(modLog)) {
      // Process mod actions for today
      modLog.forEach((action: any) => {
        if (action && action.createdAt) {
          const actionDate = new Date(action.createdAt).toISOString().split("T")[0];
          if (actionDate === today && action.action) {
            const actionType = action.action;
            modActions[actionType] = (modActions[actionType] || 0) + 1;
          }
        }
      });
      
      // Store in Redis
      await context.redis.hSet(`mod:actions:${today}`, modActions);
    }
  } catch (error) {
    console.error("Error fetching mod actions, user may not have permissions:", error);
  }
  
  try {
    // Get reported content
    const reportedContent = await context.reddit.getReports({
      subredditName: subredditName,
      limit: 50
    });
    
    if (reportedContent && Array.isArray(reportedContent)) {
      // Count reports by author
      const userReportCounts: {[username: string]: number} = {};
      reportedContent.forEach((content: any) => {
        if (content && content.author && content.author.name) {
          const author = content.author.name;
          userReportCounts[author] = (userReportCounts[author] || 0) + 1;
        }
      });
      
      // Convert to format similar to zRange result
      flaggedUsers = Object.entries(userReportCounts).map(([member, score]) => ({
        member, 
        score
      })).sort((a, b) => Number(b.score) - Number(a.score)).slice(0, 10);
      
      // Store in Redis sorted set
      for (const [user, count] of Object.entries(userReportCounts)) {
        await context.redis.zAdd("flagged:users", {
          member: user,
          score: count
        });
      }
    }
  } catch (error) {
    console.error("Error fetching reported content:", error);
  }
  
  try {
    // Get content metrics
    const modQueue = await context.reddit.getModQueue({
      subredditName: subredditName,
      limit: 1
    });
    
    const reports = await context.reddit.getReports({
      subredditName: subredditName,
      limit: 1
    });
    
    const spam = await context.reddit.getSpam({
      subredditName: subredditName,
      limit: 1
    });
    
    contentMetrics = {
      modQueueCount: modQueue && Array.isArray(modQueue) ? modQueue.length : 0,
      reportsCount: reports && Array.isArray(reports) ? reports.length : 0,
      spamCount: spam && Array.isArray(spam) ? spam.length : 0
    };
    
    // Store content metrics in Redis
    await context.redis.set("subreddit:modqueue:count", contentMetrics.modQueueCount.toString());
    await context.redis.set("subreddit:reports:count", contentMetrics.reportsCount.toString());
    await context.redis.set("subreddit:spam:count", contentMetrics.spamCount.toString());
  } catch (error) {
    console.error("Error fetching content metrics:", error);
  }
  
  // Return a combined object with all metrics
  return {
    postsStats,
    modActions,
    flaggedUsers,
    subredditInfo: subredditBasicInfo,
    subredditSettings: settings,
    contentMetrics
  };
}

async function getUserRecentActivity(context: Devvit.Context, username: string) {
  const user = await context.reddit.getUserByUsername(username);
  if (!user) return null;
  
  // Get listings
  const postsListing = await user.getPosts({
    limit: 10,
    sort: "new"
  });
  
  const commentsListing = await user.getComments({
    limit: 10,
    sort: "new"
  });
 
  const posts = Array.isArray(postsListing)
    ? postsListing
    : (typeof postsListing.all === 'function' ? await postsListing.all() : []);
  const comments = Array.isArray(commentsListing)
    ? commentsListing
    : (typeof commentsListing.all === 'function' ? await commentsListing.all() : []);
  
  return { posts, comments };
}

// Define proper types for Redis items
interface RedisZItem {
  member: string;
  score: number;
}

// Define the return type for the function to handle both success and error cases


async function analyzeUserBehavior(context: Devvit.Context, username: string): Promise<any> {
  try {
    // Initialize analysis object
    let analysis = { 
      username, 
      consistencyScore: 0, 
      flagCount: 0,
      postToCommentRatio: 0,
      avgPostKarma: 0,
      avgCommentKarma: 0,
      contentPreferences: { text: 0, image: 0, link: 0, video: 0 },
      primaryContentType: "none",
      avgResponseTimeMinutes: null as number | null,
      avgEngagementPerPost: 0,
      mostActiveSubreddits: [] as RedisZItem[],
      activityByHour: {} as Record<string, number>
    };

    // Check Redis for existing activity data
    const existingActivity = await context.redis.zRange(
      `user:${username}:activity`, 
      0, 
      -1, 
      {
        by: "score",
        reverse: true
      }
    );

    // Fetch new activity data if needed
    if (existingActivity.length < 5) {
      const recentActivity = await getUserRecentActivity(context, username);
      if (recentActivity && recentActivity.posts.length + recentActivity.comments.length > 0) {
        for (const post of recentActivity.posts) {
          await context.redis.zAdd(
            `user:${username}:activity`,
            {member: `post:${post.id}`, score: post.createdAt.getTime()}
          );
          
          // Track subreddit activity
          await context.redis.zIncrBy(
            `user:${username}:subreddits`, 
            post.subredditName,
            1
          );
          
          // Track hourly activity
          const hour = new Date(post.createdAt).getHours();
          await context.redis.zIncrBy(
            `user:${username}:hourly_activity`, 
            hour.toString(),
            1
          );
        }
        
        for (const comment of recentActivity.comments) {
          await context.redis.zAdd(
            `user:${username}:activity`,
            {member: `comment:${comment.id}`, score: comment.createdAt.getTime()}
          );
          
          // Track subreddit activity
          await context.redis.zIncrBy(
            `user:${username}:subreddits`, 
            comment.subredditName,
            1
          );
          
          // Track hourly activity
          const hour = new Date(comment.createdAt).getHours();
          await context.redis.zIncrBy(
            `user:${username}:hourly_activity`, 
            hour.toString(),
            1
          );
        }
      }
    }
   
    // Get updated activity data
    const recentActivity = await context.redis.zRange(
      `user:${username}:activity`, 
      0, 
      Date.now() + 100000, 
      {
        by: "score",
        reverse: true
      }
    ) as RedisZItem[];
    
    // Calculate consistency score
    if (recentActivity.length >= 5) {
      const timestamps = recentActivity.map((item: RedisZItem) => item.score);
      const intervals: number[] = [];
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i - 1] - timestamps[i]);
      }
      const avg = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
      const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      analysis.consistencyScore = stdDev / avg;
    }
    
    // Get flag count
    const flagScore = await context.redis.zScore("flagged:users", username);
    analysis.flagCount = flagScore !== undefined ? flagScore : 0;
    
    // Get most active subreddits
    analysis.mostActiveSubreddits = await context.redis.zRange(
      `user:${username}:subreddits`,
      0,
      4,
      { by: "score", reverse: true }
    ) as RedisZItem[];
    
    // Get hourly activity distribution
    const hourlyActivity = await context.redis.zRange(
      `user:${username}:hourly_activity`,
      0,
      23,
      { by: "lex" }
    ) as RedisZItem[];
    
    if (hourlyActivity.length > 0) {
      hourlyActivity.forEach((item: RedisZItem) => {
        analysis.activityByHour[item.member] = item.score;
      });
    }
    
    // Fetch fresh data for detailed analysis
    const userData = await getUserRecentActivity(context, username);
    if (!userData) return analysis;
    
    const { posts, comments } = userData;
    
    // 1. Post-to-comment ratio
    analysis.postToCommentRatio = posts.length > 0 ? 
      comments.length / posts.length : 
      comments.length > 0 ? Infinity : 0;
    
    // 2. Average karma per post/comment
    const totalPostKarma = posts.reduce((sum, post) => sum + post.score, 0);
    const totalCommentKarma = comments.reduce((sum, comment) => sum + comment.score, 0);
    
    analysis.avgPostKarma = posts.length > 0 ? totalPostKarma / posts.length : 0;
    analysis.avgCommentKarma = comments.length > 0 ? totalCommentKarma / comments.length : 0;
    
    // 3. Content type preferences
    const contentTypes = {
      text: 0,
      image: 0,
      link: 0,
      video: 0
    };
    
    for (const post of posts) {
      if (post.isVideo) {
        contentTypes.video++;
      } else if (post.isImage || post.gallery) {
        contentTypes.image++;
      } else if (post.url && !post.selftext) {
        contentTypes.link++;
      } else {
        contentTypes.text++;
      }
    }
    
    analysis.contentPreferences = contentTypes;
    analysis.primaryContentType = Object.entries(contentTypes)
      .sort((a, b) => b[1] - a[1])
      .filter(entry => entry[1] > 0)[0]?.[0] || "none";
    
    // 4. Response time to comments on their posts
    let totalResponseTime = 0;
    let responseCount = 0;
    for (const post of posts) {
      try {
        // Get comments on this post using the correct API approach
        const commentsListing = await context.reddit.getComments({
          postId: post.id,
          limit: 20,
          sort: "old"  // Uppercase as per API convention
        });
        
        // Get all comments from the listing
        const allComments = await commentsListing.all();
          
        // Define proper types for comments
        interface CommentType {
          authorName: string;
          createdAt: Date;
          id: string;
        }
        
        const authorComments = allComments.filter((comment: CommentType) => comment.authorName === username);
        
        if (authorComments.length > 0 && allComments.length > authorComments.length) {
          // Find earliest non-author comment
          const nonAuthorComments = allComments.filter((comment: CommentType) => comment.authorName !== username);
          if (nonAuthorComments.length > 0) {
            const earliestComment = nonAuthorComments.reduce((earliest: CommentType, comment: CommentType) => 
              comment.createdAt < earliest.createdAt ? comment : earliest, nonAuthorComments[0]);
            
            // Find earliest author response after that
            const authorResponses = authorComments.filter((comment: CommentType) => 
              comment.createdAt > earliestComment.createdAt);
            
            if (authorResponses.length > 0) {
              const earliestResponse = authorResponses.reduce((earliest: CommentType, comment: CommentType) => 
                comment.createdAt < earliest.createdAt ? comment : earliest, authorResponses[0]);
              
              // Calculate response time in minutes
              const responseTimeMs = earliestResponse.createdAt.getTime() - earliestComment.createdAt.getTime();
              const responseTimeMinutes = responseTimeMs / (1000 * 60);
              
              totalResponseTime += responseTimeMinutes;
              responseCount++;
            }
          }
        }
      } catch (error) {
        console.error(`Error analyzing comments for post ${post.id}:`, error);
      }
    }
    
    analysis.avgResponseTimeMinutes = responseCount > 0 ? totalResponseTime / responseCount : null;
    
    // 5. Engagement rate (upvotes/comments received per post)
    let totalEngagement = 0;
    
    for (const post of posts) {
      try {
        const commentsListing = post.comments;
        const allComments = await commentsListing.all();
        const commentCount = allComments.length;
        const engagement = post.score + commentCount;
        totalEngagement += engagement;
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error(`Error calculating engagement for post ${post.id}:`, error.message);
        } else {
          console.error(`Unknown error calculating engagement for post ${post.id}`);
        }
      }
    }
    
    analysis.avgEngagementPerPost = posts.length > 0 ? totalEngagement / posts.length : 0;
    
    return analysis;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error analyzing user behavior for ${username}:`, errorMessage);
    return { username, error: errorMessage };
  }
}

async function calculateInitialBotScore(context: Devvit.Context, username: string) {
  const analysis = await analyzeUserBehavior(context, username);
  
  const user = await context.reddit.getUserByUsername(username);
  if (!user) return 0;
  
  const accountAgeInDays = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  
  const recentActivity = await context.redis.zRange(
    `user:${username}:activity`, 
    0, 
    Date.now() + 100000, 
    {
      by: "score",
      reverse: true
    }
  );
  
  let botScore = 0;
  if (analysis.consistencyScore < 0.1) botScore += 40;
  else if (analysis.consistencyScore < 0.2) botScore += 20;
  
  if (accountAgeInDays < 7 && recentActivity.length > 20) botScore += 30;
  
  if (botScore > 50) {
    console.log(`${username} is probably a bot since the bot score: ${botScore}`);
  }
  
  return botScore;
}

async function fetchBotAnalysis(context: Devvit.Context) {
  const potentialBots = await context.redis.zRange("potential:bots", 0, 9, {
    by: "score",
    reverse: true
  });
  
  if (potentialBots.length === 0) {
    const subreddit = await context.reddit.getCurrentSubredditName();
    const recentPostsListing = await context.reddit.getNewPosts({
      subredditName: subreddit,
      limit: 20
    });
    
    const recentPosts = Array.isArray(recentPostsListing)
      ? recentPostsListing
      : (typeof recentPostsListing.all === 'function' ? await recentPostsListing.all() : []);
    
    const analyzedUsers = new Set();
    for (const post of recentPosts) {
      const username = post.authorName;
      if (username && !analyzedUsers.has(username)) {
        analyzedUsers.add(username);
        const analysis = await analyzeUserBehavior(context, username);
        let botScore = 0;
        if (analysis.consistencyScore < 0.1) botScore += 80;
        else if (analysis.consistencyScore < 0.2) botScore += 60;
        else if (analysis.consistencyScore < 0.3) botScore += 40;
        
        if (botScore > 30) {
          await context.redis.zAdd("potential:bots", {member: username, score: botScore});
        }
      }
    }
    
    const updatedBots = await context.redis.zRange("potential:bots", 0, 9, {
      by: "score",
      reverse: true
    });
    
    return updatedBots.map((item: RedisZItem) => ({
      username: item.member,
      botScore: item.score
    }));
  }
  
  return potentialBots.map((item: RedisZItem) => ({
    username: item.member,
    botScore: item.score
  }));
}

/* ------------------------------------------------------
   Configure Devvit & Add Triggers / Menu Items
---------------------------------------------------------*/

Devvit.configure({
  redditAPI: true,
  redis: true,
  http: true,
  media: true,
});

Devvit.addTrigger({
  event: 'PostCreate',
  onEvent: async (event, context) => {
    if (!event.post) {
      console.warn("PostCreate event missing post data.");
      return;
    }
    try {
      console.log(`New post created: ${event.post.title}`);
      const post = await context.reddit.getPostById(event.post.id);
      const postData = post as any;

      let imageUrls = [];
      let content = postData.body || "";

      const markdownImageRegex = /!\[.*?\]\(([^\s)]+)\)/g;
      let match;
      while ((match = markdownImageRegex.exec(content)) !== null) {
        const imageRef = match[1];
        if (imageRef.startsWith('http')) {
          imageUrls.push(imageRef);
        } else {
          imageUrls.push(`https://i.redd.it/${imageRef}.jpg`);
        }
      }

      content = content.replace(/!\[.*?\]\([^\s)]+\)/g, "").trim();

      if (postData.url && /\.(jpg|jpeg|png|gif)$/i.test(postData.url)) {
        imageUrls.push(postData.url);
      }

      if (postData.gallery_data && postData.media_metadata) {
        for (const item of postData.gallery_data.items) {
          const media = postData.media_metadata[item.media_id];
          if (media?.s?.u) {
            imageUrls.push(media.s.u);
          }
        }
      }
      if (postData.thumbnail && 
          typeof postData.thumbnail === 'string' && 
          postData.thumbnail !== 'self' && 
          postData.thumbnail !== 'default' &&
          postData.thumbnail !== 'nsfw') {
        imageUrls.push(postData.thumbnail);
      }

      try {
        const enrichedThumbnail = await post.getEnrichedThumbnail();
        if (enrichedThumbnail && enrichedThumbnail.image && enrichedThumbnail.image.url) {
          imageUrls.push(enrichedThumbnail.image.url);
        }
      } catch (e) {
        console.log("Error getting enriched thumbnail:", e);
      }

      await fetch('https://cerebreddit-api.cerebreddit-api.workers.dev/api/store_post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: postData.id,
          title: postData.title,
          content,
          ...(typeof postData.flair === 'string' && postData.flair.trim() && {
            flair: postData.flair.slice(0, 50)
          }),
          ...(imageUrls.length > 0 && { image_urls: imageUrls })
        }),
      });

      if (postData.body) {
        await storeEmbedding(postData.id, content);
      }
      for (const url of imageUrls) {
        await storeEmbedding(postData.id, undefined, url);
      }
    } catch (error) {
      console.error("Error in PostCreate trigger:", error);
    }
  },
});

Devvit.addTrigger({
  event: 'ModAction',
  onEvent: async (event, context) => {
    const modEvent = event as any;
    const postId = modEvent?.targetPost?.id;
    if (!postId) {
      console.warn("ModAction event missing post ID. Skipping...");
      return; 
    }
    try {
      await fetch('https://cerebreddit-api.cerebreddit-api.workers.dev/api/store_moderation_case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          action: modEvent.action,
          reason: modEvent.details || ""
        })
      });
      if (modEvent.details) {
        await storeModCaseEmbedding(modEvent.id || ("modcase_" + Date.now()), modEvent.details);
      }
    } catch (error) {
      console.error("Error in ModAction trigger:", error);
    }
  },
});
Devvit.addMenuItem({
  label: 'Select for Explanation',
  location: 'post',
  onPress: async (event, context) => {
    const postId = event.targetId;
    const post = await context.reddit.getPostById(postId);
    const postText = post.body;
    const filterdText=postText?.replace(/!\[.*?\]\([^\s)]+\)/g, "").trim()
    const explanation = await explainPost(postId, filterdText);
    // Save explanation in Redis with user-scoped key
    const username = await context.reddit.getCurrentUsername();
    await context.redis.set(`explanation:${username}`, explanation);
  },
});

Devvit.addMenuItem({
  label: 'Select for Mod Reply',
  location: 'post',
  onPress: async (event, context) => {
    const postId = event.targetId;
    const post = await context.reddit.getPostById(postId);
    const postText = post.body;
    const reply = await generateModReply(postId, postText);
    const username = await context.reddit.getCurrentUsername();
    await context.redis.set(`modreply:${username}`, reply);
  },
});




Devvit.addMenuItem({
  location: 'subreddit',
  label: 'Create Cerebreddit Dashboard',
  onPress: async (_, context) => {
    const currentSubreddit = await context.reddit.getCurrentSubreddit();
    await context.reddit.submitPost({
      title: 'Cerebreddit AI Dashboard',
      subredditName: currentSubreddit.name,
      preview: (
        <vstack alignment="center middle">
          <text>Loading Cerebreddit Dashboard...</text>
        </vstack>
      ),
    });
    context.ui.showToast(`Cerebreddit Dashboard created in r/${currentSubreddit.name}`);
  },
});

Devvit.addCustomPostType({
  name: 'Cerebreddit AI Dashboard',
  height: 'tall',
  
  render: (context: Context) => {
    const [username] = useState(async () => {
      return (await context.reddit.getCurrentUsername()) ?? 'anon';
    });
    
    const webView = useWebView<WebViewMessage, DevvitMessage>({
      url: 'page.html',
      async onMessage(message: WebViewMessage, webView) {
        switch (message.type) {
          case 'webViewReady':
            webView.postMessage({ type: 'initialData', data: { username } });
            break;
          case 'searchPosts': {
            const { query, image } = message.data;
            const imageStr = Array.isArray(image) ? image.join(',') : image;
            const results = await searchEmbeddings(query, imageStr);
            webView.postMessage({ type: 'searchResults', data: { results } });
            break;
          }
          case 'fetchSubredditInsight': {
            const insights = await fetchSubredditInsight(context,message.data.subredditName);
            webView.postMessage({ type: 'subredditInsight', data: insights });
            break;
          }
          case 'BotMeter': {
            const botScore = await calculateInitialBotScore(context, message.data.username);
            webView.postMessage({ type: 'botAnalysis', data: { botScore } });
            break;
          }
          case 'analyzeUser': {
            const analysis = await analyzeUserBehavior(context, message.data.username);
            webView.postMessage({ type: 'userAnalysis', data: analysis });
            break;
          }
          case 'PostExplanation': {
            const username = await context.reddit.getCurrentUsername();
            const explanation = await context.redis.get(`explanation:${username}`) ?? "";
            webView.postMessage({ type: 'postExplanation', data: { explanation } });
            await context.redis.del(`explanation:${username}`); // Optional: Clear after sending
            break;
          }
          case 'ModReply': {
            const username = await context.reddit.getCurrentUsername();
            const reply = await context.redis.get(`modreply:${username}`) ?? "";
            webView.postMessage({ type: 'modReplyGenerated', data: { reply } });
            await context.redis.del(`modreply:${username}`); // Optional: Clear after sending
            break;
          }
          case 'FoundMatch': {
            const postId = message.data.id;
            try {
              const post = await context.reddit.getPostById(postId);
              if (!post || !post.permalink) {
                await context.ui.showToast("Failed to retrieve post.");
                return;
              }
              await context.ui.navigateTo(`https://reddit.com${post.permalink}`);
            } catch (err) {
              console.error("Error navigating to match:", err);
              await context.ui.showToast("Something went wrong.");
            }
            break;
          }
        }
      },
    });

  
    
    return (
      <zstack width="100%" height="100%">
    
        {/* Dark overlay for better contrast */}
        <vstack
          width="100%"
          height="100%"
          backgroundColor="rgba(0, 0, 0, 0.5)"
          alignment="center"
          padding="large"
          gap="medium"
        >
          <spacer /> {/* Push content down */}
    
          {/* Inner card */}
          <vstack
            backgroundColor="neutral-background"
            padding="large"
            alignment="center"
            cornerRadius="large"
            gap="medium"
            border="thin"
            borderColor="rgba(0, 0, 0, 0.3)"
          >
            <text size="xxlarge" weight="bold" color="white">
              Welcome to Cerebreddit
            </text>
            <text size="medium" color="white">
              Hello, {username}
            </text>
            <button appearance="primary" onPress={() => webView.mount()}>
              Enter Dashboard
            </button>
          </vstack>
    
          <spacer /> {/* Push content up */}
        </vstack>
      </zstack>
    );
    
    
    
  },
});

export default Devvit;
