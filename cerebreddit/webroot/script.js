function showLoading() {
  const loadingIndicator = document.getElementById('loadingIndicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'block';
  }
}

function hideLoading() {
  const loadingIndicator = document.getElementById('loadingIndicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
}
class App {
  constructor() {
    this.usernameLabel = document.querySelector('#username');
    this.searchQueryInput = document.querySelector('#searchQuery');
    this.searchImageInput = document.querySelector('#searchImage');
    this.searchResultsDiv = document.querySelector('#searchResults');
    this.btnSearchPosts = document.querySelector('#btnSearchPosts');
    this.btnFetchInsight = document.querySelector('#btnFetchInsight');
    this.subredditInsightDiv = document.querySelector('#subredditInsight');
    this.btnAnalyzeUser = document.querySelector('#btnAnalyzeUser');
    this.btnFetchBots = document.querySelector('#btnFetchBots');
    this.userAnalysisDiv = document.querySelector('#userAnalysis');
    this.explanationDiv = document.getElementById('postExplanationContent');
    this.modReplyDiv = document.getElementById('modReplyContent');
    this.btnModreply = document.querySelector('#ModReplyer');
    this.btnPostExplainer = document.querySelector('#PostExplainer');
    this.btnNextMatch = document.querySelector('#btnNextMatch');
    this.btnPrevMatch = document.querySelector('#btnPrevMatch');
    this.matchResults = [];
    this.currentMatchIndex = 0;
    
    this.btnMatch = document.querySelector('#btnMatch');
    this.btnMatch.addEventListener('click', () => {
      const match = this.matchResults[this.currentMatchIndex];
      if (match && match.id) {
        postWebViewMessage({ type: 'FoundMatch', data: { id: match.id } });

      }
    });
    
    

    this.tabs = document.querySelectorAll('.tab-btn');
    this.panels = document.querySelectorAll('.tab-panel');
    this.setupTabs();
    this.btnNextMatch.addEventListener('click', () => this.showNextMatch());
    this.btnPrevMatch.addEventListener('click', () => this.showPreviousMatch());
    this.btnSearchPosts.addEventListener('click', () => this.handleSearchPosts());
    this.btnFetchInsight.addEventListener('click', () => this.handleFetchInsight());
    this.btnAnalyzeUser.addEventListener('click', () => this.handleAnalyzeUser());
    this.btnFetchBots.addEventListener('click', () => this.handleFetchBots());
    this.btnModreply.addEventListener('click', () => this.handleModReply());
    this.btnPostExplainer.addEventListener('click', () => this.handlePostExplanation());

    this.startScreen = document.querySelector('#startScreen');
    this.dashboardContainer = document.querySelector('#dashboardContainer');
    document.querySelector('#enterDashboard').addEventListener('click', () => this.enterDashboard());
    document.querySelector('#enterDashboard').addEventListener('click', () => {
      this.enterDashboard();
      postWebViewMessage({ type: 'webViewReady' });
    });
    window.addEventListener('message', this.onMessage.bind(this));
  }
// In your script.js for the main page.html

  enterDashboard() {
    this.startScreen.style.display = 'none';
    this.dashboardContainer.style.display = 'block';
  }
  setupTabs() {
    const placeholders = {
      search: 'Enter post text...',
      insight: 'Enter subreddit name...',
      user: 'Enter Reddit username...',
    };
  
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active classes from all tabs and panels
        this.tabs.forEach(t => t.classList.remove('active'));
        this.panels.forEach(p => p.classList.remove('active'));
  
        // Activate current tab and its panel
        tab.classList.add('active');
        const panel = document.getElementById(`${tab.dataset.tab}-panel`);
        panel.classList.add('active');
  
        // Show or hide the search box based on the selected tab
        const searchBox = document.querySelector('.search-box');
        if (tab.dataset.tab === "postExplanation" || tab.dataset.tab === "modReply") {
           searchBox.style.display = 'none';
        } else {
           searchBox.style.display = 'block';
           this.searchQueryInput.placeholder = placeholders[tab.dataset.tab];
        }
      });
    });
  }
  

  async handleSearchPosts() {
    showLoading();
    const query = this.searchQueryInput.value;
    const files = this.searchImageInput.files;
    let images = [];
    if (files.length) {
      images = await Promise.all([...files].map(file => this.fileToBase64(file)));
    }
    postWebViewMessage({ type: 'searchPosts', data: { query, image: images } });
  }

  async handleFetchInsight() {
    showLoading();
    postWebViewMessage({ type: 'fetchSubredditInsight', data: { subredditName : this.searchQueryInput.value } });
  }

  async handleAnalyzeUser() {
    showLoading();
    postWebViewMessage({ type: 'analyzeUser', data: { username: this.searchQueryInput.value } });
  }

  async handleFetchBots() {
    showLoading();
    postWebViewMessage({ type: 'BotMeter', data: { username: this.searchQueryInput.value } });
  }
  async handlePostExplanation(){
    showLoading();
    postWebViewMessage({type:'PostExplanation'})
  }
  async handleModReply(){
    showLoading();
    postWebViewMessage({type:'ModReply'})
  }

  displayMatch() {
    if (!this.matchResults.length) {
      this.searchResultsDiv.innerHTML = "<p>No matches found.</p>";
      return;
    }
    const match = this.matchResults[this.currentMatchIndex];
    this.searchResultsDiv.innerHTML = `
      <pre>
      ID: ${match.id}
      Score: ${match.score}
      Content: ${match.originalContent}
      </pre>`;
    this.searchResultsDiv.scrollTop = this.searchResultsDiv.scrollHeight;
  }
  
  showNextMatch() {
    if (this.matchResults.length && this.currentMatchIndex < this.matchResults.length - 1) {
      this.currentMatchIndex++;
      this.displayMatch();
    }
  }
  
  showPreviousMatch() {
    if (this.matchResults.length && this.currentMatchIndex > 0) {
      this.currentMatchIndex--;
      this.displayMatch();
    }
  }
  



  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  onMessage(ev) {
  
    // Check if this is a message from Devvit
    if (ev.data && ev.data.type === 'devvit-message') {
      const message = ev.data.data.message;
      if (!message || !message.type) return;
      const { type, data } = message;
      switch (type) {
        case 'initialData': {
          if (this.usernameLabel) {
            this.usernameLabel.textContent = data.username && typeof data.username === 'string'
              ? `${data.username}` : 'Anonymous';
          }
          const greeting = document.querySelector('#greeting');
          if (greeting) {
            greeting.textContent = `Hello, ${data.username || 'Anonymous'}!`;
          }
          break;
        }
      case 'searchResults':
          this.matchResults = data.results.matches; // expect array of matches
          this.currentMatchIndex = 0;
          this.displayMatch();
          this.searchResultsDiv.scrollTop = this.searchResultsDiv.scrollHeight;
          hideLoading();
        break;
      case 'subredditInsight':
        this.subredditInsightDiv.innerHTML = `
        <div class="info-block">
          <h4>r/${data.subredditInfo.name}</h4>
          <p><strong>Subscribers:</strong> ${data.subredditInfo.subscribersCount}</p>
          <p><strong>Created:</strong> ${new Date(data.subredditInfo.createdAt).toLocaleDateString()}</p>
          <p><strong>NSFW:</strong> <span class="pill ${data.subredditSettings.isNsfw ? 'red' : 'green'}">${data.subredditSettings.isNsfw ? 'Yes' : 'No'}</span></p>
          <p><strong>Posting Restricted:</strong> <span class="pill ${data.subredditSettings.isPostingRestricted ? 'yellow' : 'green'}">${data.subredditSettings.isPostingRestricted}</span></p>
          <p><strong>Commenting Restricted:</strong> <span class="pill ${data.subredditSettings.isCommentingRestricted ? 'yellow' : 'green'}">${data.subredditSettings.isCommentingRestricted}</span></p>
          <p><strong>Mod Queue:</strong> ${data.contentMetrics.modQueueCount}</p>
          <p><strong>Reports:</strong> ${data.contentMetrics.reportsCount}</p>
          <p><strong>Spam Count:</strong> ${data.contentMetrics.spamCount}</p>
        </div>
      `;
        this.subredditInsightDiv.scrollTop = this.subredditInsightDiv.scrollHeight;
        hideLoading();
        break;
      // Updated botAnalysis case to use botScore, which matches main.tsx
      case 'botAnalysis':
        this.userAnalysisDiv.innerHTML = `
        <div class="info-block">
          <h4>Bot Detection</h4>
          <p><strong>Bot Score:</strong> ${data.botScore}</p>
          <p>Status: ${
            data.botScore === 0 ? '<span class="pill green">No Signs</span>' :
            data.botScore > 49 ? '<span class="pill red"> Likely Bot</span>' :
            '<span class="pill yellow"> Suspicious</span>'
          }</p>
        </div>
      `;
      
        this.userAnalysisDiv.scrollTop = this.userAnalysisDiv.scrollHeight;
        hideLoading();
        break;
      case 'userAnalysis':
        this.userAnalysisDiv.innerHTML = `
        <div class="info-block">
          <h4>User: u/${data.username}</h4>
          <p><strong>Consistency Score:</strong> ${data.consistencyScore.toFixed(2)}</p>
          <p><strong>Flag Count:</strong> ${data.flagCount}</p>
          <p><strong>Avg Engagement Per Post:</strong> ${data.avgEngagementPerPost.toFixed(2)}</p>
          <p><strong>Post:Comment Ratio:</strong> ${data.postToCommentRatio}</p>
          <p><strong>Avg Post Karma:</strong> ${data.avgPostKarma}</p>
          <p><strong>Avg Comment Karma:</strong> ${data.avgCommentKarma}</p>

          <h5>Content Preferences:</h5>
          ${Object.entries(data.contentPreferences).map(([type, val]) => `
            <div class="bar-label">${type} (${val})</div>
            <div class="bar-container"><div class="bar" style="width:${val * 10}px"></div></div>
          `).join('')}

          <h5>Most Active Subreddits:</h5>
          <ul>
            ${data.mostActiveSubreddits.map(sub => `<li>${sub.member} (${sub.score})</li>`).join('')}
          </ul>

          <h5>Activity by Hour:</h5>
          <ul>
            ${Object.entries(data.activityByHour).map(([hour, count]) => `<li>${hour}:00 — ${count} actions</li>`).join('')}
          </ul>
        </div>
      `;

        this.userAnalysisDiv.scrollTop = this.userAnalysisDiv.scrollHeight;
        hideLoading();
        break;
        case 'postExplanation': {
          // Update the explanation panel content
          
          if (!data.explanation || data.explanation.trim() === "") {
            this.explanationDiv.innerHTML = "<p>Please select a post to generate an explanation.</p>";
          } else {
            this.explanationDiv.innerHTML = `<pre>${data.explanation}</pre>`;
            this.explanationDiv.scrollTop = this.explanationDiv.scrollHeight;
          }
          hideLoading();
          break;
        }
        case 'modReplyGenerated': {
          // Update the mod reply panel content
          if (!data.reply || data.reply.trim() === "") {
            this.modReplyDiv.innerHTML = "<p>Please select a post to generate a mod reply.</p>";
          } else {
            this.modReplyDiv.innerHTML = `<pre>${data.reply}</pre>`;
            this.modReplyDiv.scrollTop = this.modReplyDiv.scrollHeight;
          }
          hideLoading();
          break;
        }
      default:
        console.warn("Unhandled message type:", type);
    }
  }
}

}

function postWebViewMessage(msg) {
  parent.postMessage(msg, '*');
}

new App();
