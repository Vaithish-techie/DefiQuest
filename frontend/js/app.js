const API_BASE = 'http://localhost:8000/api';
let wallet = localStorage.getItem('deFiQuestWallet');

const dom = {
    loginBtn: () => document.getElementById('login-btn'),
    walletDisplay: () => document.getElementById('wallet-display'),
    signoutBtn: () => document.getElementById('signout-btn'),
    mainContent: () => document.getElementById('main-content'),
    sidebar: () => document.getElementById('sidebar'),
    quizModal: () => document.getElementById('quiz-modal'),
    sidebarNav: () => document.querySelector('.sidebar-nav'),
};

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updateUI();
    if (wallet) {
        renderRoadmap();
    } else {
        renderLandingPage();
    }
});

function setupEventListeners() {
    dom.loginBtn()?.addEventListener('click', handleLogin);
    dom.signoutBtn()?.addEventListener('click', handleLogout);
}

async function handleLogin() {
    const connectedWallet = await connectWallet();
    if (connectedWallet) {
        wallet = connectedWallet;
        localStorage.setItem('deFiQuestWallet', wallet);
        updateUI();
        renderRoadmap();
    }
}

function handleLogout() {
    localStorage.removeItem('deFiQuestWallet');
    wallet = null;
    updateUI();
    renderLandingPage();
}

function updateUI() {
    const loggedIn = !!wallet;
    dom.loginBtn()?.classList.toggle('hidden', loggedIn);
    dom.signoutBtn()?.classList.toggle('hidden', !loggedIn);
    dom.sidebar()?.classList.toggle('hidden', !loggedIn);
    dom.walletDisplay().textContent = loggedIn ? `✅ ${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}` : '';
}

function setupSidebarNav() {
    const nav = dom.sidebarNav();
    if (nav) {
        nav.onclick = (e) => {
            if (e.target.tagName === 'BUTTON') {
                document.querySelectorAll('.sidebar-nav button').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                if (e.target.id === 'nav-roadmap') renderRoadmap();
                if (e.target.id === 'nav-profile') renderProfile();
            }
        };
    }
}

function renderLandingPage() {
    dom.mainContent().innerHTML = `
    <section class="landing-wrap">
      <div class="landing-title">Welcome to DeFiQuest</div>
      <div class="landing-desc">
        Your personal AI tutor for mastering decentralized finance. Follow a guided roadmap, test your knowledge, and earn NFT badges for your achievements.
      </div>
      <div class="landing-section">
        <div class="benefit-card"><h3>🗺️ Guided Learning</h3><p>Follow a structured curriculum designed to take you from novice to expert. No more guessing what to learn next.</p></div>
        <div class="benefit-card"><h3>🏆 Earn NFT Badges</h3><p>Prove your expertise. Successfully complete quests to mint exclusive NFT badges directly to your wallet.</p></div>
        <div class="benefit-card"><h3>📈 Track Your Progress</h3><p>Your profile tracks completed quests, total XP, and earned badges, giving you a complete overview of your journey.</p></div>
      </div>
      <button id="landing-login-btn" class="navmode-btn">Connect Wallet to Start</button>
    </section>`;
    document.getElementById('landing-login-btn')?.addEventListener('click', handleLogin);
}

async function renderRoadmap() {
    dom.mainContent().innerHTML = `<div class="loading-message"><div class="spinner"></div>Loading your learning roadmap...</div>`;
    setupSidebarNav();
    try {
        const [roadmapRes, profileRes] = await Promise.all([
            fetch(`${API_BASE}/roadmap`),
            fetch(`${API_BASE}/profile?address=${wallet}`)
        ]);

        if (!roadmapRes.ok || !profileRes.ok) throw new Error('Failed to load roadmap data.');

        const roadmap = (await roadmapRes.json()).data;
        const profile = (await profileRes.json()).data;
        const completedQuests = new Set(Object.keys(profile.completed_quests || {}));
        
        const totalQuests = roadmap.length;
        const questsCompleted = completedQuests.size;
        const progress = totalQuests > 0 ? (questsCompleted / totalQuests) * 100 : 0;

        let roadmapHTML = `
            <div class="roadmap-header">
                <h1>DeFi Learning Roadmap</h1>
                <p>Complete quests in order to unlock new topics and master decentralized finance. This structured path mirrors a BlockDAG, where each completed quest validates your knowledge and unlocks the next set of challenges.</p>
                <div class="progress-bar-container">
                    <span>${questsCompleted} / ${totalQuests} Quests Completed</span>
                    <div class="progress-bar"><div class="progress-bar-fill" style="width: ${progress}%;"></div></div>
                </div>
            </div>
            <div class="roadmap-grid">`;

        roadmap.forEach(quest => {
            const isCompleted = completedQuests.has(quest.id);
            const prerequisitesMet = quest.prerequisites.every(prereq => completedQuests.has(prereq));
            const isAvailable = !isCompleted && prerequisitesMet;
            const isLocked = !isCompleted && !prerequisitesMet;

            let statusClass = isCompleted ? 'completed' : isAvailable ? 'available' : 'locked';
            
            roadmapHTML += `
                <div class="quest-card ${statusClass}" 
                     data-quest-id="${quest.id}" 
                     data-quest-title="${quest.title}" 
                     ${isAvailable ? 'onclick="startQuiz(this)"' : ''}>
                    <div class="quest-status-icon"></div>
                    <h3 class="quest-title">${quest.title}</h3>
                    <p class="quest-desc">${quest.description}</p>
                    <div class="quest-footer">
                        <span>${quest.xp} XP</span>
                        ${isLocked ? `<span>Requires: ${quest.prerequisites.map(p => `"${p.split('-').pop()}"`).join(', ')}</span>` : ''}
                    </div>
                </div>`;
        });

        roadmapHTML += `</div>`;
        dom.mainContent().innerHTML = roadmapHTML;
    } catch (error) {
        dom.mainContent().innerHTML = `<p class="error-message">Error loading roadmap: ${error.message}</p>`;
    }
}

function startQuiz(element) {
    const questId = element.getAttribute('data-quest-id');
    const questTitle = element.getAttribute('data-quest-title');
    handleQuizGeneration(questId, questTitle);
}

async function handleQuizGeneration(questId, questTitle) {
    const statusDiv = document.createElement('div');
    statusDiv.innerHTML = `<div class="loading-message"><div class="spinner"></div>Generating your quiz on "${questTitle}"...</div>`;
    dom.mainContent().prepend(statusDiv);
    try {
        const response = await fetch(`${API_BASE}/quests/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questId }),
        });
        if (!response.ok) throw new Error('Failed to generate quiz.');
        const quizData = (await response.json()).data;
        if (quizData && Array.isArray(quizData.questions) && quizData.questions.length > 0) {
            quizData.questId = questId;
            openQuizModal(quizData);
        } else {
            throw new Error('Received invalid quiz data from server.');
        }
    } catch (e) {
        statusDiv.innerHTML = `<p class="error-message">❌ ${e.message}</p>`;
    } finally {
        setTimeout(() => statusDiv.remove(), 3000);
    }
}

function openQuizModal(quiz) {
    const modal = dom.quizModal();
    modal.classList.remove('hidden');
    let questionsHTML = '';
    quiz.questions.forEach((q, i) => {
        questionsHTML += `
        <div class="quiz-question">
          <h3>${i + 1}. ${q.text}</h3>
          <div class="quiz-choices">
            ${q.choices.map((c, j) => `<label class="choice-option"><input type="radio" name="q${q.id}" value="${j}"/><span>${c}</span></label>`).join('')}
          </div>
        </div>`;
    });
    modal.innerHTML = `
    <div class="modal-content">
      <span class="modal-close" title="Close">&times;</span>
      <div class="quiz-title">🧠 ${quiz.topic.toUpperCase()} Quiz</div>
      <form id="quiz-form">
        ${questionsHTML}
        <div class="quiz-submit"><button type="submit">Submit Answers</button></div>
      </form>
      <div id="quiz-result" class="quiz-result"></div>
    </div>`;
    modal.querySelector('.modal-close').onclick = () => modal.classList.add('hidden');
    document.getElementById('quiz-form').onsubmit = (e) => handleQuizSubmission(e, quiz);
}

async function handleQuizSubmission(event, quiz) {
    event.preventDefault();
    const form = event.target;
    const resultDiv = document.getElementById('quiz-result');
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = `<div class="spinner"></div>Analyzing...`;
    let answers = {};
    for (const q of quiz.questions) {
        const val = form[`q${q.id}`]?.value;
        if (val === undefined || val === '') {
            alert(`Please answer all questions.`);
            submitButton.disabled = false;
            submitButton.innerHTML = `Submit Answers`;
            return;
        }
        answers[q.id] = Number(val);
    }
    try {
        const response = await fetch(`${API_BASE}/quests/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userAddress: wallet, questId: quiz.questId, answers }),
        });
        if (!response.ok) throw new Error('Failed to submit answers.');
        const result = (await response.json()).data;
        if (result.all_correct) {
            resultDiv.className = 'quiz-result success-message';
            resultDiv.innerHTML = `🎉 Congratulations! You earned ${result.xp_earned} XP! NFT minting triggered.`;
            setTimeout(() => {
                dom.quizModal().classList.add('hidden');
                renderRoadmap();
            }, 2500);
        } else {
            resultDiv.className = 'quiz-result failure-message';
            resultDiv.innerHTML = `Not quite! ${result.feedback || 'Try again to master the topic.'}`;
            submitButton.disabled = false;
            submitButton.innerHTML = `Submit Answers`;
        }
    } catch (e) {
        resultDiv.className = 'quiz-result failure-message';
        resultDiv.innerHTML = `Error: ${e.message}`;
        submitButton.disabled = false;
        submitButton.innerHTML = `Submit Answers`;
    }
}

async function renderProfile() {
    dom.mainContent().innerHTML = `<div class="loading-message"><div class="spinner"></div>Loading your profile...</div>`;
    setupSidebarNav();
    try {
        const response = await fetch(`${API_BASE}/profile?address=${wallet}`);
        if (!response.ok) throw new Error('Failed to load profile.');
        const data = (await response.json()).data;
        const badgesHTML = data.badges && data.badges.length > 0 ? data.badges.map(b => `<div class="badge-item"><img src="${b.image_url}" alt="${b.name}" title="${b.name}"/><span>${b.name}</span></div>`).join('') : '<p>No badges earned yet. Complete a quiz to get your first one!</p>';
        const profileHTML = `
        <h1>My Profile</h1>
        <div class="profile-grid">
            <div class="stat-card"><h3>Total XP</h3><div class="value">${data.xp || 0}</div></div>
            <div class="stat-card"><h3>Quests Passed</h3><div class="value">${Object.keys(data.completed_quests || {}).length}</div></div>
            <div class="stat-card"><h3>Current Streak</h3><div class="value">${data.streak || 0} days</div></div>
            <div class="ai-feedback"><h3>🤖 AI Insights</h3><p>${data.ai_feedback || 'Keep learning to get insights!'}</p></div>
            <div class="badges-panel"><h3>🏆 My NFT Badges</h3><div class="badges-grid">${badgesHTML}</div></div>
        </div>`;
        dom.mainContent().innerHTML = profileHTML;
    } catch (error) {
        dom.mainContent().innerHTML = `<p class="error-message">Error loading profile: ${error.message}</p>`;
    }
}
