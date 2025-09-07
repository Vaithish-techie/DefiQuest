const API_BASE = "http://localhost:8000/api";
let wallet = localStorage.getItem("deFiQuestWallet");
let roadmapCache = null;
let quizCache = null;
// profileCache is no longer needed as we fetch fresh data on each render.

const dom = {
  loginBtn: () => document.getElementById("login-btn"),
  walletDisplay: () => document.getElementById("wallet-display"),
  signoutBtn: () => document.getElementById("signout-btn"),
  mainContent: () => document.getElementById("main-content"),
  sidebar: () => document.getElementById("sidebar"),
  quizModal: () => document.getElementById("quiz-modal"),
  sidebarNav: () => document.querySelector(".sidebar-nav"),
  dailyGoal: () => document.getElementById("daily-goal"),
  toastContainer: () => document.getElementById("toast-container"),
};

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  updateUI();
  if (wallet) {
    renderRoadmap();
  } else {
    renderLandingPage();
  }
});

function setupEventListeners() {
  dom.loginBtn()?.addEventListener("click", handleLogin);
  dom.signoutBtn()?.addEventListener("click", handleLogout);
}

async function handleLogin() {
  // Assumes a connectWallet() function exists, e.g., in wallet.js
  const connectedWallet = await connectWallet();
  if (connectedWallet) {
    wallet = connectedWallet;
    localStorage.setItem("deFiQuestWallet", wallet);
    updateUI();
    renderRoadmap();
  }
}

function handleLogout() {
  localStorage.removeItem("deFiQuestWallet");
  wallet = null;
  roadmapCache = null;
  quizCache = null;
  updateUI();
  renderLandingPage();
}

function updateUI() {
  const loggedIn = !!wallet;
  dom.loginBtn()?.classList.toggle("hidden", loggedIn);
  dom.signoutBtn()?.classList.toggle("hidden", !loggedIn);
  dom.sidebar()?.classList.toggle("hidden", !loggedIn);
  dom.dailyGoal()?.classList.toggle("hidden", !loggedIn);
  dom.walletDisplay().textContent = loggedIn
    ? `✅ ${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}`
    : "";
}

function setupSidebarNav() {
  const nav = dom.sidebarNav();
  if (nav) {
    nav.onclick = (e) => {
      const button = e.target.closest("button");
      if (button) {
        document
          .querySelectorAll(".sidebar-nav button")
          .forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
        if (button.id === "nav-roadmap") renderRoadmap();
        if (button.id === "nav-profile") renderProfile();
      }
    };
  }
}

function showToast(message, type = "info") {
  const container = dom.toastContainer();
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("show");
  }, 100);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

function renderLandingPage() {
  dom.mainContent().innerHTML = `
    <div class="landing-hero">
        <h1 class="landing-title">Master DeFi, One Quest at a Time.</h1>
        <p class="landing-desc">DeFiQuest provides a guided, gamified roadmap to transform you from a blockchain novice to a decentralized finance expert. Connect your wallet to start your journey.</p>
        <button id="landing-login-btn" class="navmode-btn large">Begin Your Quest</button>
    </div>`;
  document
    .getElementById("landing-login-btn")
    ?.addEventListener("click", handleLogin);
}

async function renderRoadmap() {
  dom.mainContent().innerHTML = `<div class="loading-message"><div class="spinner"></div>Loading your learning roadmap...</div>`;
  setupSidebarNav();
  try {
    if (!roadmapCache) {
      roadmapCache = (await (await fetch(`${API_BASE}/roadmap`)).json()).data;
    }
    const profileData = (
      await (await fetch(`${API_BASE}/profile?address=${wallet}`)).json()
    ).data;
    const completedQuests = new Set(
      Object.keys(profileData.profile.completed_quests || {})
    );
    updateDailyGoal(profileData.profile.completed_quests);
    const progress =
      roadmapCache.length > 0
        ? (completedQuests.size / roadmapCache.length) * 100
        : 0;
    let roadmapHTML = `<div class="roadmap-header"><h1>DeFi Learning Roadmap</h1><p>Complete quests in order. Each unlocked quest builds on your knowledge.</p><div class="progress-bar-container"><span>${completedQuests.size} / ${roadmapCache.length} Quests Completed</span><div class="progress-bar"><div class="progress-bar-fill" style="width: ${progress}%;"></div></div></div></div><div class="roadmap-grid">`;
    roadmapCache.forEach((quest) => {
      const isCompleted = completedQuests.has(quest.id);
      const prerequisitesMet = quest.prerequisites.every((prereq) =>
        completedQuests.has(prereq)
      );
      const isLocked = !isCompleted && !prerequisitesMet;
      const statusClass = isCompleted
        ? "completed"
        : isLocked
        ? "locked"
        : "available";
      const clickHandler = isLocked ? "" : `onclick="viewQuest('${quest.id}')"`;
      roadmapHTML += `<div class="quest-card ${statusClass}" ${clickHandler}><div class="quest-status-icon"></div><h3 class="quest-title">${quest.title}</h3><p class="quest-desc">${quest.description}</p><div class="quest-footer"><span>${quest.xp} XP</span><span class="category-tag">${quest.category}</span></div></div>`;
    });
    roadmapHTML += `</div>`;
    dom.mainContent().innerHTML = roadmapHTML;
  } catch (error) {
    dom.mainContent().innerHTML = `<p class="error-message">Error loading roadmap: ${error.message}</p>`;
  }
}

async function viewQuest(questId) {
  dom.mainContent().innerHTML = `<div class="loading-message"><div class="spinner"></div>Loading Quest...</div>`;
  try {
    const response = await fetch(`${API_BASE}/quests/${questId}`);
    if (!response.ok) throw new Error("Could not fetch quest details.");
    const quest = (await response.json()).data;
    let questHTML = `<div class="quest-view"><button class="back-to-roadmap" onclick="renderRoadmap()">← Back to Roadmap</button><span class="category-tag large">${
      quest.category
    }</span><h1>${quest.title}</h1><p class="quest-intro">${
      quest.introduction
    }</p><h2>Learning Resources</h2><div class="resource-list">${quest.resources
      .map(
        (r) =>
          `<a href="${r.url}" target="_blank" class="resource-link">${r.title}</a>`
      )
      .join(
        ""
      )}</div><div class="quiz-launcher"><h2>Test Your Knowledge</h2><p>To complete the quest, you must score at least 30%.</p><div class="quiz-controls"><select id="num-questions-select"><option value="3">3 Questions</option><option value="5" selected>5 Questions</option><option value="7">7 Questions</option></select><button class="navmode-btn large" onclick="startQuiz('${
      quest.id
    }', '${quest.title}')">Generate Quiz</button></div></div></div>`;
    dom.mainContent().innerHTML = questHTML;
  } catch (error) {
    dom.mainContent().innerHTML = `<p class="error-message">Error loading quest: ${error.message}</p>`;
  }
}

function startQuiz(questId, questTitle) {
  const numQuestions = document.getElementById("num-questions-select").value;
  handleQuizGeneration(questId, questTitle, parseInt(numQuestions));
}

async function handleQuizGeneration(questId, questTitle, numQuestions) {
  showToast(`Generating your ${numQuestions}-question quiz...`, "info");
  try {
    const response = await fetch(`${API_BASE}/quests/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questId, num_questions: numQuestions }),
    });
    if (!response.ok) throw new Error("Failed to generate quiz from API.");
    const quizData = (await response.json()).data;
    if (
      quizData &&
      Array.isArray(quizData.questions) &&
      quizData.questions.length > 0
    ) {
      quizCache = { ...quizData, questId };
      openQuizModal(quizCache);
    } else {
      throw new Error("Received invalid quiz data from server.");
    }
  } catch (e) {
    showToast(`Error: ${e.message}`, "error");
  }
}

function openQuizModal(quiz) {
  const modal = dom.quizModal();
  modal.classList.remove("hidden");
  let questionsHTML = "";
  quiz.questions.forEach((q, i) => {
    questionsHTML += `<div class="quiz-question"><h3>${i + 1}. ${
      q.text
    }</h3><div class="quiz-choices">${q.choices
      .map(
        (c, j) =>
          `<label class="choice-option"><input type="radio" name="q${q.id}" value="${j}"/><span>${c}</span></label>`
      )
      .join("")}</div></div>`;
  });
  modal.innerHTML = `<div class="modal-content"><span class="modal-close" title="Close">&times;</span><div class="quiz-title">🧠 ${quiz.topic.toUpperCase()} Quiz</div><form id="quiz-form">${questionsHTML}<div class="quiz-submit"><button type="submit">Submit Answers</button></div></form></div>`;
  modal.querySelector(".modal-close").onclick = () =>
    modal.classList.add("hidden");
  document.getElementById("quiz-form").onsubmit = (e) =>
    handleQuizSubmission(e, quiz);
}

async function handleQuizSubmission(event, quiz) {
  event.preventDefault();
  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.innerHTML = `<div class="spinner"></div>Analyzing...`;
  const userAnswers = {};
  for (const q of quiz.questions) {
    const val = form[`q${q.id}`]?.value;
    if (val === undefined || val === "") {
      alert(`Please answer all questions.`);
      submitButton.disabled = false;
      submitButton.innerHTML = `Submit Answers`;
      return;
    }
    userAnswers[q.id] = Number(val);
  }
  try {
    const response = await fetch(`${API_BASE}/quests/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userAddress: wallet,
        questId: quiz.questId,
        questions: quiz.questions,
        answers: userAnswers,
      }),
    });
    const resBody = await response.json();
    if (!response.ok)
      throw new Error(resBody.data.message || "Failed to submit answers.");
    const result = resBody.data;
    dom.quizModal().classList.add("hidden");
    renderQuizResults(result, userAnswers);
  } catch (e) {
    showToast(`Error submitting quiz: ${e.message}`, "error");
    submitButton.disabled = false;
    submitButton.innerHTML = `Submit Answers`;
  }
}

function renderQuizResults(result, userAnswers) {
  const quest = quizCache;
  if (!quest) {
    renderRoadmap();
    return;
  }
  let nextQuest = null;
  if (result.success && roadmapCache) {
    const completedQuests = new Set(Object.keys(result.completed_quests || {}));
    nextQuest = roadmapCache.find(
      (q) =>
        !completedQuests.has(q.id) &&
        q.prerequisites.every((p) => completedQuests.has(p))
    );
  }
  let resultsHTML = `<div class="results-page"><h1>Quiz Results: ${
    quest.topic
  }</h1><div class="results-summary ${
    result.success ? "success" : "failure"
  }"><h2>${
    result.success ? "Quest Passed!" : "Needs Improvement"
  }</h2><p>You scored</p><div class="score-display">${result.score}</div>${
    result.success
      ? `<p>You've earned ${result.xp_earned} XP and an NFT badge is being minted to your wallet!</p>`
      : `<p>A score of 30% or higher is required to pass. Review your answers and try again!</p>`
  }</div>`;
  if (result.success) {
    resultsHTML += `<div class="next-quest-promo">`;
    if (nextQuest) {
      resultsHTML += `<h2>🚀 Next Quest Unlocked!</h2><div class="quest-card available" onclick="viewQuest('${nextQuest.id}')"><div class="quest-status-icon"></div><h3>${nextQuest.title}</h3><p>${nextQuest.description}</p></div>`;
    } else {
      resultsHTML += `<h2>🏆 Congratulations!</h2><p>You have completed the entire DeFiQuest roadmap!</p>`;
    }
    resultsHTML += `</div>`;
  }
  resultsHTML += `<h2>Your Answers</h2><div class="results-breakdown">`;
  quest.questions.forEach((q, i) => {
    const userAnswerIndex = userAnswers[q.id];
    const correctAnswerIndex = q.correct_index;
    const isCorrect = userAnswerIndex === correctAnswerIndex;
    resultsHTML += `<div class="result-question ${
      isCorrect ? "correct" : "incorrect"
    }"><h3>${i + 1}. ${q.text}</h3><div class="result-choices">`;
    q.choices.forEach((choice, j) => {
      let choiceClass = "";
      if (j === correctAnswerIndex) {
        choiceClass = "correct-answer";
      } else if (j === userAnswerIndex && !isCorrect) {
        choiceClass = "incorrect-answer";
      }
      resultsHTML += `<div class="result-choice ${choiceClass}">${choice}</div>`;
    });
    resultsHTML += `</div></div>`;
  });
  resultsHTML += `</div><div class="results-actions"><button class="navmode-btn large" onclick="renderRoadmap()">Back to Roadmap</button>${
    !result.success
      ? `<button class="navmode-btn large secondary" onclick="viewQuest('${quest.questId}')">Try Again</button>`
      : ""
  }</div></div>`;
  dom.mainContent().innerHTML = resultsHTML;
  quizCache = null;
}

// --- FINAL RENDERPROFILE FUNCTION ---
async function renderProfile() {
  dom.mainContent().innerHTML = `<div class="loading-message"><div class="spinner"></div>Loading your learning analytics...</div>`;
  setupSidebarNav();
  try {
    if (!roadmapCache) {
      roadmapCache = (await (await fetch(`${API_BASE}/roadmap`)).json()).data;
    }

    const [profileResponse, ethBalanceResponse, blockdagBalanceResponse] =
      await Promise.all([
        fetch(`${API_BASE}/profile?address=${wallet}`),
        fetch(`${API_BASE}/nft/balance/${wallet}/ethereum`),
        fetch(`${API_BASE}/nft/balance/${wallet}/blockdag`),
      ]);

    if (!profileResponse.ok)
      throw new Error(
        `Failed to load profile data. Status: ${profileResponse.status}`
      );

    const profilePayload = await profileResponse.json();
    const ethPayload = ethBalanceResponse.ok
      ? await ethBalanceResponse.json()
      : { data: { balance: "Error" } };
    const blockdagPayload = blockdagBalanceResponse.ok
      ? await blockdagBalanceResponse.json()
      : { data: { balance: "Error" } };

    const profile = profilePayload.data.profile;
    const analytics = profilePayload.data.analytics;
    const ethBalance = ethPayload.data?.balance ?? "N/A";
    const blockdagBalance = blockdagPayload.data?.balance ?? "N/A";

    const badgesHTML =
      profile.badges && profile.badges.length > 0
        ? profile.badges
            .map(
              (b) =>
                `<div class="badge-item"><img src="${b.image_url}" alt="${b.name}" title="${b.name}"/><span>${b.name}</span></div>`
            )
            .join("")
        : "<p>No simulated badges earned yet. Complete quests to unlock them!</p>";

    let nextQuestSuggestion =
      '<div class="quest-card completed"><h3 class="quest-title">All Quests Completed!</h3><p>You have mastered the DeFi Roadmap. Congratulations!</p></div>';
    const completed = new Set(Object.keys(profile.completed_quests || {}));
    const nextQuest = roadmapCache.find(
      (q) =>
        !completed.has(q.id) && q.prerequisites.every((p) => completed.has(p))
    );
    if (nextQuest) {
      nextQuestSuggestion = `<div class="quest-card available" onclick="viewQuest('${nextQuest.id}')"><div class="quest-status-icon"></div><h3 class="quest-title">${nextQuest.title}</h3><p class="quest-desc">${nextQuest.description}</p></div>`;
    }

    let analyticsHTML = `<div class="analytics-panel"><h3>🧠 Performance Breakdown</h3><div class="analytics-grid">`;
    if (
      analytics.performance_by_category &&
      analytics.performance_by_category.length > 0
    ) {
      analytics.performance_by_category.forEach((cat) => {
        analyticsHTML += `<div class="stat-card category-performance"><h4>${
          cat.category
        }</h4><div class="value">${cat.average_score.toFixed(
          1
        )}%</div><span>Avg. Score</span></div>`;
      });
    } else {
      analyticsHTML += `<p>Complete some quizzes to see your performance breakdown.</p>`;
    }
    analyticsHTML += `</div></div>`;

    if (analytics.most_challenging_quest) {
      analyticsHTML += `<div class="analytics-panel"><h3>🤔 Most Challenging Quest</h3><p>This is the quest you've had to retry the most. Might be worth another look!</p><div class="quest-card locked" onclick="viewQuest('${analytics.most_challenging_quest.id}')"><div class="quest-status-icon"></div><h3 class="quest-title">${analytics.most_challenging_quest.title}</h3><p class="quest-desc">${analytics.most_challenging_quest.description}</p></div></div>`;
    }

    const profileHTML = `
            <h1>My Profile</h1>
            <div class="profile-grid">
                <div class="stat-card"><h3>Total XP</h3><div class="value">${
                  profile.xp || 0
                }</div></div>
                <div class="stat-card"><h3>Quests Passed</h3><div class="value">${
                  Object.keys(profile.completed_quests || {}).length
                }</div></div>
                <div class="stat-card"><h3>Current Streak</h3><div class="value">${
                  profile.streak || 0
                } days</div></div>
                
                <!-- On-Chain NFT Balance Cards -->
                <div class="stat-card"><h3>Sepolia Badges</h3><div class="value">${ethBalance}</div></div>
                <div class="stat-card"><h3>BlockDAG Badges</h3><div class="value">${blockdagBalance}</div></div>
                
                ${analyticsHTML}

                <div class="ai-feedback"><h3>🤖 AI Coach Insights</h3><p>${
                  profile.ai_feedback || "Keep learning to get insights!"
                }</p></div>
                <div class="next-quest-panel"><h3>🚀 Next Up</h3>${nextQuestSuggestion}</div>
                <div class="badges-panel"><h3>🏆 My Simulated Badges</h3><div class="badges-grid">${badgesHTML}</div></div>
            </div>`;

    dom.mainContent().innerHTML = profileHTML;
  } catch (error) {
    console.error("Error loading profile:", error);
    dom.mainContent().innerHTML = `<p class="error-message">Error loading profile: ${error.message}</p>`;
  }
}

function updateDailyGoal(completedQuests) {
  const today = new Date().toISOString().split("T")[0];
  const hasCompletedToday = Object.values(completedQuests || {}).some((date) =>
    date.startsWith(today)
  );
  const goalDiv = dom.dailyGoal();
  if (goalDiv) {
    goalDiv.textContent = hasCompletedToday
      ? "✅ Daily Goal Met!"
      : "🎯 Complete a Quest Today!";
    goalDiv.classList.toggle("completed", hasCompletedToday);
  }
}
