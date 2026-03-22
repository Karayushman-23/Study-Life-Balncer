// Global variables
let studyRoutine = [];
let studyData = {
    subjects: [],
    totalStudyTime: 0,
    activityTime: 0,
    completedSessions: 0,
    quizScores: []
};
let currentQuizIndex = 0;
let currentQuizAnswers = [];
let activeTimers = [];
const userSeesion = sessionStorage.getItem("currentSession");
let taskList = [];
let tasksRedeemed = false;

// Initialize Auth Manager
const authManager = new AuthManager();
let parsedUser = null;
try {
    parsedUser = userSeesion ? JSON.parse(userSeesion) : null;
} catch (e) {
    parsedUser = null;
}
const user_name = parsedUser?.name || "guest";
document.getElementById("Greetings").textContent=`Hello,${user_name}`;

// Update user greeting with logged-in user's name
function updateUserGreeting() {
    const session = authManager.getSession();
    if (session && session.name) {
        document.getElementById('Greetings').textContent = `Hello, ${session.name}`;
    }
}

// Update time and day
function updateDateTime() {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    document.getElementById('currentDay').textContent = days[now.getDay()];
    document.getElementById('currentTime').textContent = now.toLocaleTimeString();
}

// Update greeting and start time updates when page loads
document.addEventListener('DOMContentLoaded', function() {
    updateUserGreeting();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    const profileImg = document.getElementById('profile-picture');
    if (profileImg) {
        profileImg.addEventListener('click', openDashboard);
    }
    loadTasks();
});

// Show Routine Form
function showRoutineForm() {
    const previewDiv = document.getElementById('preview');
    previewDiv.innerHTML = `
        <div class="preview-content">
            <div class="form-container">
                <div class="form-title">📚 Create Your Study Routine</div>
                
                <div class="form-group">
                    <label>Total Study Time Available (hours):</label>
                    <input type="number" id="totalTime" min="1" max="12" value="4" placeholder="e.g., 4">
                </div>

                <div class="form-group">
                    <label>Activity/Break Time per hour (minutes):</label>
                    <input type="number" id="activityTime" min="5" max="30" value="15" placeholder="e.g., 15">
                </div>

                <div id="subjectsContainer">
                    <div class="form-group">
                        <label>Subjects to Study:</label>
                        <div id="subjectsList">
                            <div class="subject-entry">
                                <input type="text" placeholder="Subject name (e.g., Mathematics)" class="subject-name" style="margin-bottom: 10px;">
                                <input type="number" placeholder="Study duration (minutes)" class="subject-duration" min="15" max="180" value="45">
                            </div>
                        </div>
                        <button class="add-subject-btn" onclick="addSubjectField()">+ Add Another Subject</button>
                    </div>
                </div>

                <button class="submit-btn" onclick="generateRoutine()">🎯 Generate My Routine</button>
            </div>
        </div>
    `;
}

// Add subject field
function addSubjectField() {
    const subjectsList = document.getElementById('subjectsList');
    const newSubject = document.createElement('div');
    newSubject.className = 'subject-entry';
    newSubject.innerHTML = `
        <input type="text" placeholder="Subject name" class="subject-name" style="margin-bottom: 10px;">
        <input type="number" placeholder="Study duration (minutes)" class="subject-duration" min="15" max="180" value="45">
    `;
    subjectsList.appendChild(newSubject);
}

// Generate Routine
function generateRoutine() {
    const totalTime = parseInt(document.getElementById('totalTime').value) || 4;
    const activityTime = parseInt(document.getElementById('activityTime').value) || 15;
    
    const subjectNames = document.querySelectorAll('.subject-name');
    const subjectDurations = document.querySelectorAll('.subject-duration');
    
    const subjects = [];
    subjectNames.forEach((nameInput, index) => {
        const name = nameInput.value.trim();
        const duration = parseInt(subjectDurations[index].value) || 45;
        if (name) {
            subjects.push({ name, duration });
        }
    });

    if (subjects.length === 0) {
        showNotification('Error', 'Please add at least one subject!');
        return;
    }

    // Generate routine schedule
    studyRoutine = [];
    let currentTime = new Date();
    currentTime.setHours(currentTime.getHours(), 0, 0, 0);

    const activities = [
        'Eye Exercises - Look away from screen',
        'Stretching - Neck and shoulder rolls',
        'Walking - Quick 5-minute walk',
        'Breathing Exercise - Deep breaths',
        'Water Break - Hydrate yourself',
        'Physical Activity - Jumping jacks or push-ups'
    ];

    let activityIndex = 0;

    subjects.forEach((subject, index) => {
        // Add study session
        const startTime = new Date(currentTime);
        currentTime.setMinutes(currentTime.getMinutes() + subject.duration);
        const endTime = new Date(currentTime);

        studyRoutine.push({
            type: 'study',
            subject: subject.name,
            startTime: startTime,
            endTime: endTime,
            duration: subject.duration,
            activity: activities[activityIndex % activities.length]
        });

        // Add activity break after study session
        const breakStart = new Date(currentTime);
        currentTime.setMinutes(currentTime.getMinutes() + activityTime);
        const breakEnd = new Date(currentTime);

        studyRoutine.push({
            type: 'activity',
            subject: activities[activityIndex % activities.length],
            startTime: breakStart,
            endTime: breakEnd,
            duration: activityTime
        });

        activityIndex++;
    });

    // Store study data
    studyData.subjects = subjects;
    studyData.totalStudyTime = totalTime;
    studyData.activityTime = activityTime;

    buildTasksFromRoutine();
    tasksRedeemed = false;
    saveTasks();
    displayRoutine();
    startRoutineTimers();
}

// Display Routine
function displayRoutine() {
    const previewDiv = document.getElementById('preview');
    
    let routineHTML = `
        <div class="preview-content">
            <div class="routine-schedule">
                <div class="form-title">⏰ Your Study Schedule</div>
                <p style="color: #666; margin-bottom: 20px;">Reminders will notify you when it's time to switch activities!</p>
    `;

    studyRoutine.forEach((item, index) => {
        const startTime = item.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const endTime = item.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        if (item.type === 'study') {
            routineHTML += `
                <div class="routine-item">
                    <div>
                        <div class="routine-time">${startTime} - ${endTime}</div>
                        <div class="routine-activity">📖 Study: ${item.subject} (${item.duration} min)</div>
                        <div style="font-size: 12px; color: #666; margin-top: 5px;">Next break: ${item.activity}</div>
                    </div>
                    <span class="routine-type">STUDY</span>
                </div>
            `;
        } else {
            routineHTML += `
                <div class="routine-item">
                    <div>
                        <div class="routine-time">${startTime} - ${endTime}</div>
                        <div class="routine-activity">🏃 ${item.subject} (${item.duration} min)</div>
                    </div>
                    <span class="routine-type" style="background: #8FC0A9;">BREAK</span>
                </div>
            `;
        }
    });

    routineHTML += `
            </div>
            <button class="submit-btn" onclick="showRoutineForm()">🔄 Create New Routine</button>
            <div class="task-list">
                <div class="form-title" style="font-size:22px;">✅ Routine Tasks</div>
                ${renderTaskList()}
            </div>
        </div>
    `;

    previewDiv.innerHTML = routineHTML;
    showNotification('Success!', 'Your routine has been created! You will receive reminders.');
}

// Show checklist view
function showChecklist() {
    loadTasks();
    const previewDiv = document.getElementById('preview');
    previewDiv.innerHTML = `
        <div class="preview-content">
            <div class="dashboard-container">
                <div class="dashboard-title">✅ My Checklist</div>
                <p style="color:#666; margin-bottom:16px;">Complete routine tasks to earn points.</p>
                <div class="task-list">
                    <div class="form-title" style="font-size:22px;">Tasks</div>
                    ${renderTaskList()}
                </div>
                <button class="submit-btn" style="margin-top:16px;" onclick="showRoutineForm()">+ Generate Routine</button>
            </div>
        </div>
    `;
}

// Build tasks from current routine (study items only)
function buildTasksFromRoutine() {
    taskList = studyRoutine.map(item => {
        const isStudy = item.type === 'study';
        return {
            id: `${item.type}_${item.subject}_${item.startTime.getTime()}`,
            label: isStudy
                ? `Study ${item.subject} for ${item.duration} min`
                : `Do activity: ${item.subject} (${item.duration} min)`,
            completed: false,
        };
    });
}

function getTaskStorageKey() {
    const session = authManager.getSession();
    const userId = session ? session.userId : 'guest';
    return `tasks_${userId}`;
}

function saveTasks() {
    try {
        localStorage.setItem(getTaskStorageKey(), JSON.stringify({
            tasks: taskList,
            redeemed: tasksRedeemed
        }));
    } catch (e) {
        console.warn('Failed to save tasks', e);
    }
}

function loadTasks() {
    try {
        const raw = localStorage.getItem(getTaskStorageKey());
        if (!raw) {
            taskList = [];
            tasksRedeemed = false;
            return;
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            taskList = parsed;
            tasksRedeemed = false;
        } else {
            taskList = parsed.tasks || [];
            tasksRedeemed = !!parsed.redeemed;
        }
    } catch (e) {
        taskList = [];
        tasksRedeemed = false;
    }
}

function renderTaskList() {
    if (!taskList.length) {
        return '<p style="color:#666;">No tasks yet. Generate a routine to create tasks.</p>';
    }
    const allComplete = taskList.length > 0 && taskList.every(t => t.completed);
    const redeemDisabled = !allComplete || tasksRedeemed;
    const redeemLabel = tasksRedeemed ? 'Redeemed' : `Redeem (${taskList.length * 5} pts)`;
    return `
        <ul class="tasks">
            ${taskList.map(task => `
                <li class="task-item">
                    <label>
                        <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTaskComplete('${task.id}')">
                        <span class="${task.completed ? 'task-completed' : ''}">${task.label}</span>
                    </label>
                </li>
            `).join('')}
        </ul>
        <button class="submit-btn" style="margin-top:12px;" onclick="redeemTasks()" ${redeemDisabled ? 'disabled' : ''}>
            ${redeemLabel}
        </button>
    `;
}

function toggleTaskComplete(taskId) {
    const task = taskList.find(t => t.id === taskId);
    if (!task) return;
    task.completed = !task.completed;
    if (!task.completed) {
        tasksRedeemed = false; // allow re-completion and re-redeem cycle within same routine
    }
    saveTasks();
    const previewDiv = document.getElementById('preview');
    if (previewDiv && previewDiv.querySelector('.task-list')) {
        previewDiv.querySelector('.task-list').innerHTML = `
            <div class="form-title" style="font-size:22px;">✅ Routine Tasks</div>
            ${renderTaskList()}
        `;
    }
}

function redeemTasks() {
    const allComplete = taskList.length > 0 && taskList.every(t => t.completed);
    if (!allComplete || tasksRedeemed) return;
    const session = authManager.getSession();
    const userId = session ? session.userId : null;
    const pointsEarned = taskList.length * 5;
    authManager.addPoints(userId, pointsEarned);
    tasksRedeemed = true;
    saveTasks();
    showNotification('Points Redeemed', `You earned ${pointsEarned} points!`);
    const previewDiv = document.getElementById('preview');
    if (previewDiv && previewDiv.querySelector('.task-list')) {
        previewDiv.querySelector('.task-list').innerHTML = `
            <div class="form-title" style="font-size:22px;">✅ Routine Tasks</div>
            ${renderTaskList()}
        `;
    }
}

// Start Routine Timers
function startRoutineTimers() {
    // Clear existing timers
    activeTimers.forEach(timer => clearTimeout(timer));
    activeTimers = [];

    const now = new Date();

    studyRoutine.forEach((item, index) => {
        const timeUntilStart = item.startTime - now;
        
        if (timeUntilStart > 0) {
            const timer = setTimeout(() => {
                if (item.type === 'study') {
                    showNotification(
                        '📚 Study Time!',
                        `Time to study ${item.subject} for ${item.duration} minutes. Focus and stay consistent!`
                    );
                } else {
                    showNotification(
                        '🏃 Break Time!',
                        `Take a ${item.duration}-minute break. Activity: ${item.subject}. Stay active!`
                    );
                }
                studyData.completedSessions++;
            }, timeUntilStart);
            
            activeTimers.push(timer);
        }
    });
}

// Show Notification
function showNotification(title, message) {
    const notification = document.getElementById('notification');
    notification.innerHTML = `
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
    `;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

// Show Dashboard
function showDashboard() {
    const previewDiv = document.getElementById('preview');
    
    // Calculate statistics
    const totalSubjects = studyData.subjects.length;
    const avgQuizScore = studyData.quizScores.length > 0 
        ? (studyData.quizScores.reduce((a, b) => a + b, 0) / studyData.quizScores.length).toFixed(1)
        : 0;
    const studyHours = studyData.totalStudyTime;
    const completedSessions = studyData.completedSessions;

    let subjectBreakdown = '';
    studyData.subjects.forEach(subject => {
        const percentage = (subject.duration / (studyData.totalStudyTime * 60)) * 100;
        subjectBreakdown += `
            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="font-weight: bold;">${subject.name}</span>
                    <span>${subject.duration} min (${percentage.toFixed(1)}%)</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    });

    previewDiv.innerHTML = `
        <div class="preview-content">
            <div class="dashboard-container">
                <div class="dashboard-title">📊 Activity Dashboard</div>
                
                <div class="stat-grid">
                    <div class="stat-card">
                        <div class="stat-value">${totalSubjects}</div>
                        <div class="stat-label">Subjects</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${studyHours}h</div>
                        <div class="stat-label">Study Time</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${completedSessions}</div>
                        <div class="stat-label">Completed Sessions</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${avgQuizScore}%</div>
                        <div class="stat-label">Avg Quiz Score</div>
                    </div>
                </div>

                <div style="background: white; padding: 20px; border-radius: 15px; margin-top: 20px;">
                    <h3 style="color: #68B0AB; margin-bottom: 15px;">📚 Subject Distribution</h3>
                    ${subjectBreakdown || '<p style="color: #999;">No subjects added yet. Create a routine to see your distribution!</p>'}
                </div>

                <div style="background: white; padding: 20px; border-radius: 15px; margin-top: 20px;">
                    <h3 style="color: #68B0AB; margin-bottom: 15px;">📈 Recent Quiz Scores</h3>
                    ${studyData.quizScores.length > 0 
                        ? studyData.quizScores.map((score, i) => `
                            <div style="background: #f9f9f9; padding: 10px; border-radius: 8px; margin-bottom: 8px;">
                                Quiz ${i + 1}: <strong>${score}%</strong>
                            </div>
                        `).join('')
                        : '<p style="color: #999;">Take quizzes to track your progress!</p>'
                    }
                </div>

                <div style="background: white; padding: 20px; border-radius: 15px; margin-top: 20px;">
                    <h3 style="color: #68B0AB; margin-bottom: 10px;">💡 Productivity Tips</h3>
                    <ul style="color: #666; line-height: 2;">
                        <li>Take regular breaks every 45-60 minutes</li>
                        <li>Stay hydrated - drink water during breaks</li>
                        <li>Practice eye exercises to reduce strain</li>
                        <li>Review your quiz performance weekly</li>
                        <li>Maintain consistent study hours daily</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
}

// Show Daily Quiz
function showDailyQuiz() {
    if (studyData.subjects.length === 0) {
        showNotification('No Subjects', 'Please create a routine first to generate quizzes!');
        return;
    }

    currentQuizIndex = 0;
    currentQuizAnswers = [];
    
    const quizQuestions = generateQuizQuestions();
    displayQuizQuestion(quizQuestions, 0);
}

// Generate Quiz Questions
function generateQuizQuestions() {
    const questions = [];
    
    // General study questions
    const generalQuestions = [
        {
            subject: 'Study Skills',
            question: 'What is the recommended study duration before taking a break?',
            options: ['25-30 minutes', '45-60 minutes', '90-120 minutes', '3-4 hours'],
            correct: 1
        },
        {
            subject: 'Health',
            question: 'Which exercise is best for reducing eye strain during study?',
            options: ['20-20-20 rule (look 20ft away for 20s every 20min)', 'Continuous reading', 'Bright screen settings', 'Studying in dark'],
            correct: 0
        },
        {
            subject: 'Productivity',
            question: 'What percentage of study time should be dedicated to breaks?',
            options: ['5-10%', '15-25%', '40-50%', '60-70%'],
            correct: 1
        },
        {
            subject: 'Memory',
            question: 'Which technique helps in better retention of information?',
            options: ['Passive reading', 'Active recall and spaced repetition', 'Cramming before exams', 'Multitasking'],
            correct: 1
        }
    ];

    // Add subject-specific questions
    studyData.subjects.forEach(subject => {
        questions.push({
            subject: subject.name,
            question: `How much time are you dedicating to ${subject.name} today?`,
            options: [`${subject.duration} minutes`, `${subject.duration + 15} minutes`, `${subject.duration - 15} minutes`, `${subject.duration * 2} minutes`],
            correct: 0
        });
    });

    // Mix general and subject questions
    const mixedQuestions = [...generalQuestions, ...questions];
    return mixedQuestions.slice(0, 5); // Return 5 questions
}

// Display Quiz Question
function displayQuizQuestion(questions, index) {
    const previewDiv = document.getElementById('preview');
    const question = questions[index];
    
    previewDiv.innerHTML = `
        <div class="preview-content">
            <div class="quiz-container">
                <div class="form-title">📝 Daily Quiz - Question ${index + 1}/${questions.length}</div>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                    <strong style="color: #68B0AB;">Subject: ${question.subject}</strong>
                </div>
                <div class="quiz-question">${question.question}</div>
                <ul class="quiz-options" id="quizOptions">
                    ${question.options.map((option, i) => `
                        <li class="quiz-option" onclick="selectQuizOption(${i})" data-index="${i}">
                            ${String.fromCharCode(65 + i)}. ${option}
                        </li>
                    `).join('')}
                </ul>
                <div class="quiz-nav">
                    <button class="quiz-btn" onclick="previousQuestion()" ${index === 0 ? 'disabled' : ''}>← Previous</button>
                    <button class="quiz-btn" id="nextBtn" onclick="nextQuestion()" disabled>
                        ${index === questions.length - 1 ? 'Submit Quiz' : 'Next →'}
                    </button>
                </div>
            </div>
        </div>
    `;

    // Store questions in global scope
    window.currentQuizQuestions = questions;
}

// Select Quiz Option
function selectQuizOption(optionIndex) {
    const options = document.querySelectorAll('.quiz-option');
    options.forEach(opt => opt.classList.remove('selected'));
    options[optionIndex].classList.add('selected');
    
    currentQuizAnswers[currentQuizIndex] = optionIndex;
    document.getElementById('nextBtn').disabled = false;
}

// Next Question
function nextQuestion() {
    const questions = window.currentQuizQuestions;
    
    if (currentQuizIndex < questions.length - 1) {
        currentQuizIndex++;
        displayQuizQuestion(questions, currentQuizIndex);
    } else {
        showQuizResults(questions);
    }
}

// Previous Question
function previousQuestion() {
    if (currentQuizIndex > 0) {
        currentQuizIndex--;
        displayQuizQuestion(window.currentQuizQuestions, currentQuizIndex);
    }
}

// Show Quiz Results
function showQuizResults(questions) {
    let correctAnswers = 0;
    questions.forEach((q, index) => {
        if (currentQuizAnswers[index] === q.correct) {
            correctAnswers++;
        }
    });

    const score = ((correctAnswers / questions.length) * 100).toFixed(0);
    studyData.quizScores.push(parseInt(score));

    // Award 1 point per correct answer and log the total in auth manager
    const session = authManager.getSession();
    const userId = session ? session.userId : null;
    authManager.addPoints(userId, correctAnswers);

    const previewDiv = document.getElementById('preview');
    previewDiv.innerHTML = `
        <div class="preview-content">
            <div class="quiz-container">
                <div class="form-title">🎉 Quiz Complete!</div>
                <div style="text-align: center; padding: 30px;">
                    <div style="font-size: 72px; margin-bottom: 20px;">
                        ${score >= 80 ? '🌟' : score >= 60 ? '👍' : '📚'}
                    </div>
                    <div style="font-size: 48px; font-weight: bold; color: #68B0AB; margin-bottom: 10px;">
                        ${score}%
                    </div>
                    <div style="font-size: 18px; color: #666; margin-bottom: 30px;">
                        You got ${correctAnswers} out of ${questions.length} correct!
                    </div>
                    <div class="progress-bar" style="max-width: 300px; margin: 0 auto 30px;">
                        <div class="progress-fill" style="width: ${score}%"></div>
                    </div>
                    <p style="color: #666;">
                        ${score >= 80 ? 'Excellent work! Keep up the great study habits!' : 
                          score >= 60 ? 'Good job! Review your weak areas for improvement.' : 
                          'Keep practicing! Regular review will improve your scores.'}
                    </p>
                </div>
                <button class="submit-btn" onclick="showDailyQuiz()">Take Another Quiz</button>
                <button class="submit-btn" onclick="showDashboard()" style="margin-top: 10px; background: #8FC0A9;">View Dashboard</button>
            </div>
        </div>
    `;

    showNotification('Quiz Completed!', `You scored ${score}%! Great effort!`);
}

// Open Profile Dashboard
function openDashboard() {
    const modal = document.getElementById('dashboardModal');
    if (!modal) return;

    const user = authManager.getCurrentUser();
    const session = authManager.getSession();

    const points = user ? authManager.getPoints(user.id) : 0;
    document.getElementById('dashUserId').textContent = user?.id ?? 'Guest';
    document.getElementById('dashName').textContent = user?.name ?? 'Guest';
    document.getElementById('dashEmail').textContent = user?.email ?? 'Not logged in';
    document.getElementById('dashLoginCount').textContent = user?.loginCount ?? 0;
    document.getElementById('dashPoints').textContent = points;
    document.getElementById('dashLastLogin').textContent = user?.lastLogin 
        ? new Date(user.lastLogin).toLocaleString()
        : session?.loginTime 
            ? new Date(session.loginTime).toLocaleString()
            : 'N/A';

    // Toggle login prompt
    const prompt = document.getElementById('dashLoginPrompt');
    if (prompt) {
        prompt.style.display = user ? 'none' : 'block';
    }

    modal.classList.add('show');
}

// Close Profile Dashboard
function closeDashboard() {
    const modal = document.getElementById('dashboardModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Go to login page when not authenticated
function goToLogin() {
    window.location.href = 'starter.html';
}