#  Cerebreddit – AI-Powered Reddit Assistant

Cerebreddit is a **Reddit  tool** powered by **Devvit** and **AI** that enhances subreddit moderation, content insight, and user behavior analysis. It features a sleek AI dashboard accessible via a Reddit post, with support for text & image search, auto explanations, mod replies, subreddit insights, bot detection, and user analysis.

---

##  Features

###  AI-Powered Post Search
- **Search by vague text** (e.g., "That Elon Musk post").
- **Search by image**: Upload screenshots to find similar Reddit posts.
- Shows the **top 5 best-matching posts** with navigation:
  - **Forward / Backward buttons** to cycle matches.
  - **Found button** to navigate to the selected Reddit post.

###  Explain Any Post
- click any post options and choose **"Select for Explanation"**.
- AI-generated explanation is shown in the **WebView dashboard**.

###  Auto-Generated Moderator Replies
- click any post options and choose **"Select for Mod Reply"**.
- AI generates a suggested reply (for users or other mods).
- Reply is displayed in the WebView, ready to copy/paste.

###  Mod Case Memory (Embeddings)
- Stores **mod action details** using embeddings.
- Enables **future context-aware moderation searches** (planned).

###  Subreddit Insight Dashboard
- Pulls and displays:
  - Subscriber count
  - NSFW status
  - Posting/Commenting restrictions
  - Spam/Report/Mod queue metrics
  - Post frequency chart
  - Mod action types and trends
  - Top flagged users

###  User Behavior Analysis
Enter any Reddit username to see:
- **Consistency Score**: Measures posting regularity.
- **Flag Count**: # of times flagged by mods or reports.
- **Karma Averages**: Post & comment karma.
- **Post:Comment Ratio**
- **Content Preferences**: Text, image, video, link.
- **Engagement Metrics**: Response time, interaction level.
- **Hourly Activity** & **Top Subreddits**.

###  Bot Detection
- Calculates **bot score** based on behavior.
- If score > 50 → likely a bot.
- Uses posting patterns, account age, consistency, etc.

---

##  How It Works

### 1. Dashboard Creation
Click the **"Create Cerebreddit Dashboard"** button in the subreddit menu. This creates a post that serves as an AI control panel for your subreddit.

### 2. Post Search
- Navigate to the **Search** tab.
- Enter vague text or upload images to search.
- Use **Forward/Backward** to browse matches.
- Click **Found** to jump to the matching Reddit post.

### 3. Post Explanation / Mod Reply
- Visit any post → Use the **post menu** (three dots) → select:
  - **"Select for Explanation"** to generate summary.
  - **"Select for Mod Reply"** to get AI moderation comment.
- Return to dashboard and open the relevant tab.

### 4. Subreddit Insight
- Go to the **Insight** tab.
- Enter subreddit name.
- Click **"Show Subreddit Insight"**.

### 5. User Analysis
- Go to the **User** tab.
- Enter username.
- Click **Analyze User** or **Bot Meter**.

---

##  Technologies Used

- **Devvit**: Reddit's TypeScript-based app platform.
- **Redis**: Caching for user activity and analytics.
- **Cloudflare Worker**: For embedding storage and AI inference.
- **Cohere** : Embeddings.
- **OpenRouter (deepseek-r1)** : Ai model.
- **Pinecone**: Vector search for post similarity.
- **Custom WebView**: Built with HTML/CSS/JS.
- **React/JSX**: Custom Devvit post types.
- **Supabase**: Remote Database.

##  Credits
Developed by **Joshua Momoh**  
