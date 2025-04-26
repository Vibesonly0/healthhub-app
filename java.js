document.addEventListener('DOMContentLoaded', function() {
    // ===== AUTHENTICATION SYSTEM =====
    const authPage = document.getElementById('auth-page');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignup = document.getElementById('show-signup');
    const showLogin = document.getElementById('show-login');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userName = document.getElementById('user-name');

    // Toggle between login and signup forms
    showSignup.addEventListener('click', function(e) {
        e.preventDefault();
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
    });

    showLogin.addEventListener('click', function(e) {
        e.preventDefault();
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    // Login function
    loginBtn.addEventListener('click', function() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            alert('Please fill in all fields');
            return;
        }

        // In a real app, you would validate with a server
        // For demo purposes, we'll use localStorage
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            // Successful login
            authPage.classList.add('hidden');
            appContainer.classList.remove('hidden');
            userName.textContent = user.name;
            
            // Initialize app
            initializeApp();
        } else {
            alert('Invalid email or password');
        }
    });

    // Signup function
    signupBtn.addEventListener('click', function() {
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirm = document.getElementById('signup-confirm').value;

        if (!name || !email || !password || !confirm) {
            alert('Please fill in all fields');
            return;
        }

        if (password !== confirm) {
            alert('Passwords do not match');
            return;
        }

        // In a real app, you would validate and send to a server
        // For demo purposes, we'll use localStorage
        const users = JSON.parse(localStorage.getItem('users')) || [];
        
        if (users.some(u => u.email === email)) {
            alert('Email already registered');
            return;
        }

        const newUser = {
            name,
            email,
            password
        };

        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));

        // Auto-login after signup
        authPage.classList.add('hidden');
        appContainer.classList.remove('hidden');
        userName.textContent = name;
        
        // Initialize app
        initializeApp();
    });

    // Logout function
    logoutBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to logout?')) {
            authPage.classList.remove('hidden');
            appContainer.classList.add('hidden');
            
            // Clear form fields
            document.getElementById('login-email').value = '';
            document.getElementById('login-password').value = '';
            document.getElementById('signup-name').value = '';
            document.getElementById('signup-email').value = '';
            document.getElementById('signup-password').value = '';
            document.getElementById('signup-confirm').value = '';
            
            // Show login form
            signupForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        }
    });

    // ===== MAIN APP FUNCTIONALITY =====
    function initializeApp() {
        // Tab Navigation
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                
                // Remove active class from all buttons and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked button and corresponding content
                button.classList.add('active');
                document.getElementById(tabId).classList.add('active');
                
                // Initialize charts when their tab becomes active
                if (tabId === 'health') initHealthChart();
                if (tabId === 'exercise') initExerciseChart();
                if (tabId === 'nutrition') initNutritionChart();
            });
        });
        
        // Quick Action Buttons
        document.getElementById('log-meal-btn').addEventListener('click', () => {
            document.querySelector('.tab-btn[data-tab="nutrition"]').click();
            document.querySelector('.meal-planning').scrollIntoView({ behavior: 'smooth' });
        });
        
        document.getElementById('start-workout-btn').addEventListener('click', () => {
            document.querySelector('.tab-btn[data-tab="exercise"]').click();
        });
        
        document.getElementById('set-reminder-btn').addEventListener('click', () => {
            document.querySelector('.tab-btn[data-tab="reminders"]').click();
        });
        
        document.getElementById('play-music-btn').addEventListener('click', () => {
            document.querySelector('.tab-btn[data-tab="music"]').click();
        });
        
        // Health Data Saving
        document.getElementById('save-health-data').addEventListener('click', saveHealthData);
        
        // Exercise Plan Selector
        document.getElementById('workout-plan-select').addEventListener('change', showWorkoutPlanDetails);
        
        // Save Workout
        document.getElementById('save-workout').addEventListener('click', saveWorkout);
        
        // Nutrition - Save Meal
        document.getElementById('save-meal').addEventListener('click', saveMeal);
        
        // Music Player Functionality
        setupMusicPlayer();
        
        // Reminders
        document.getElementById('save-reminder').addEventListener('click', saveReminder);
        document.getElementById('reminder-filter').addEventListener('change', filterReminders);
        
        // Initialize charts on dashboard load
        initHealthChart();
        initExerciseChart();
        initNutritionChart();
        
        // Load saved reminders
        loadReminders();
        
        // Request notification permission
        if (Notification.permission !== "granted") {
            Notification.requestPermission();
        }
        
        // Update dashboard stats
        updateDashboardStats();
    }

    // ===== REMINDER SYSTEM =====
    let scheduledReminders = [];

    function loadReminders() {
        const savedReminders = JSON.parse(localStorage.getItem('reminders')) || [];
        const remindersContainer = document.getElementById('reminders-container');
        const remindersList = document.getElementById('reminders-list');
        
        // Clear existing reminders
        remindersContainer.innerHTML = '';
        remindersList.innerHTML = '';
        
        // Clear any scheduled timeouts
        scheduledReminders.forEach(timeout => clearTimeout(timeout));
        scheduledReminders = [];
        
        if (savedReminders.length === 0) {
            remindersContainer.innerHTML = '<li class="empty-message">No reminders set yet</li>';
            remindersList.innerHTML = '<li class="empty-message">No upcoming reminders</li>';
            return;
        }
        
        // Add reminders to UI and schedule notifications
        savedReminders.forEach(reminder => {
            addReminderToUI(reminder);
            scheduleNotification(reminder);
        });
    }

    function saveReminder() {
        const title = document.getElementById('reminder-title').value;
        const time = document.getElementById('reminder-time').value;
        const date = document.getElementById('reminder-date').value;
        const repeat = document.getElementById('reminder-repeat').value;
        const category = document.getElementById('reminder-category').value;
        
        if (!title || !time || !date) {
            alert('Please fill in all required fields');
            return;
        }
        
        const reminder = {
            id: Date.now(),
            title,
            time,
            date,
            repeat,
            category,
            completed: false
        };
        
        // Save to localStorage
        const reminders = JSON.parse(localStorage.getItem('reminders')) || [];
        reminders.push(reminder);
        localStorage.setItem('reminders', JSON.stringify(reminders));
        
        // Add to UI and schedule notification
        addReminderToUI(reminder);
        scheduleNotification(reminder);
        
        // Clear form
        document.getElementById('reminder-title').value = '';
        document.getElementById('reminder-time').value = '';
        document.getElementById('reminder-date').value = '';
    }

    function scheduleNotification(reminder) {
        const reminderTime = new Date(`${reminder.date}T${reminder.time}`);
        const now = new Date();
        const timeUntilReminder = reminderTime - now;
        
        if (timeUntilReminder > 0) {
            const timeoutId = setTimeout(() => {
                showNotification(reminder.title, reminder.category);
                
                // Handle repeating reminders
                if (reminder.repeat !== "none") {
                    const newDate = new Date(reminderTime);
                    
                    if (reminder.repeat === "daily") newDate.setDate(newDate.getDate() + 1);
                    if (reminder.repeat === "weekly") newDate.setDate(newDate.getDate() + 7);
                    if (reminder.repeat === "monthly") newDate.setMonth(newDate.getMonth() + 1);
                    
                    const newReminder = {
                        ...reminder,
                        id: Date.now(),
                        date: newDate.toISOString().split('T')[0]
                    };
                    
                    // Save the new reminder
                    const reminders = JSON.parse(localStorage.getItem('reminders')) || [];
                    reminders.push(newReminder);
                    localStorage.setItem('reminders', JSON.stringify(reminders));
                    
                    // Add to UI and schedule
                    addReminderToUI(newReminder);
                    scheduleNotification(newReminder);
                }
            }, timeUntilReminder);
            
            scheduledReminders.push(timeoutId);
        }
    }

    function showNotification(title, category) {
        if (Notification.permission === "granted") {
            new Notification("HealthHub Reminder", {
                body: `Time to: ${title} (${category})`,
                icon: "https://via.placeholder.com/48"
            });
        }
    }

    function addReminderToUI(reminder) {
        const remindersContainer = document.getElementById('reminders-container');
        const remindersList = document.getElementById('reminders-list');
        
        const reminderTime = new Date(`${reminder.date}T${reminder.time}`);
        const formattedDate = reminderTime.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
        const formattedTime = reminderTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // Remove empty message if it exists
        const emptyMsg = remindersContainer.querySelector('.empty-message');
        if (emptyMsg) emptyMsg.remove();
        
        // Add to main reminders list
        const reminderItem = document.createElement('li');
        reminderItem.className = 'reminder-item';
        reminderItem.dataset.id = reminder.id;
        reminderItem.dataset.date = reminder.date;
        
        reminderItem.innerHTML = `
            <div class="reminder-checkbox">
                <input type="checkbox" ${reminder.completed ? 'checked' : ''}>
            </div>
            <div class="reminder-details">
                <h4>${reminder.title}</h4>
                <p>${formattedDate} at ${formattedTime}</p>
                <p class="reminder-category ${reminder.category}">${reminder.category.charAt(0).toUpperCase() + reminder.category.slice(1)}</p>
            </div>
            <div class="reminder-actions">
                <button class="edit-btn"><i class="fas fa-edit"></i></button>
                <button class="delete-btn"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        remindersContainer.appendChild(reminderItem);
        
        // Add to dashboard upcoming reminders if today
        const today = new Date();
        if (reminderTime.toDateString() === today.toDateString()) {
            const upcomingEmptyMsg = remindersList.querySelector('.empty-message');
            if (upcomingEmptyMsg) upcomingEmptyMsg.remove();
            
            const upcomingReminder = document.createElement('li');
            upcomingReminder.innerHTML = `<i class="far fa-clock"></i> ${reminder.title} - ${formattedTime}`;
            remindersList.appendChild(upcomingReminder);
        }
        
        // Add event listeners
        reminderItem.querySelector('input[type="checkbox"]').addEventListener('change', function() {
            reminder.completed=true;
            reminder.completed = this.checked;
            const reminders = JSON.parse(localStorage.getItem('reminders')) || [];
            const index = reminders.findIndex(r => r.id === reminder.id);
            if (index !== -1) {
                reminders[index].completed = this.checked;
                localStorage.setItem('reminders', JSON.stringify(reminders));
            }
        });
        
        reminderItem.querySelector('.delete-btn').addEventListener('click', function() {
            if (confirm('Are you sure you want to delete this reminder?')) {
                const reminders = JSON.parse(localStorage.getItem('reminders')) || [];
                const updatedReminders = reminders.filter(r => r.id !== reminder.id);
                localStorage.setItem('reminders', JSON.stringify(updatedReminders));
                reminderItem.remove();
                
                // Show empty message if no reminders left
                if (updatedReminders.length === 0) {
                    remindersContainer.innerHTML = '<li class="empty-message">No reminders set yet</li>';
                    
                    const todayReminders = updatedReminders.filter(r => {
                        const reminderDate = new Date(`${r.date}T${r.time}`);
                        return reminderDate.toDateString() === new Date().toDateString();
                    });
                    
                    if (todayReminders.length === 0) {
                        remindersList.innerHTML = '<li class="empty-message">No upcoming reminders</li>';
                    }
                }
            }
        });
        
        reminderItem.querySelector('.edit-btn').addEventListener('click', function() {
            editReminder(reminder);
        });
    }

    function editReminder(reminder) {
        document.getElementById('reminder-title').value = reminder.title;
        document.getElementById('reminder-time').value = reminder.time;
        document.getElementById('reminder-date').value = reminder.date;
        document.getElementById('reminder-repeat').value = reminder.repeat;
        document.getElementById('reminder-category').value = reminder.category;
        
        const saveBtn = document.getElementById('save-reminder');
        saveBtn.textContent = 'Update Reminder';
        saveBtn.onclick = function() {
            updateReminder(reminder.id);
            saveBtn.textContent = 'Set Reminder';
            saveBtn.onclick = saveReminder;
        };
    }

    function updateReminder(id) {
        const title = document.getElementById('reminder-title').value;
        const time = document.getElementById('reminder-time').value;
        const date = document.getElementById('reminder-date').value;
        const repeat = document.getElementById('reminder-repeat').value;
        const category = document.getElementById('reminder-category').value;
        
        if (!title || !time || !date) {
            alert('Please fill in all required fields');
            return;
        }
        
        const reminders = JSON.parse(localStorage.getItem('reminders')) || [];
        const index = reminders.findIndex(r => r.id === id);
        
        if (index !== -1) {
            reminders[index] = {
                ...reminders[index],
                title,
                time,
                date,
                repeat,
                category
            };
            
            localStorage.setItem('reminders', JSON.stringify(reminders));
            loadReminders();
        }
    }

    function filterReminders() {
        const filter = document.getElementById('reminder-filter').value;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        document.querySelectorAll('.reminder-item').forEach(item => {
            const reminderDate = new Date(item.dataset.date);
            const completed = item.querySelector('input[type="checkbox"]').checked;
            
            let show = true;
            
            switch (filter) {
                case 'today':
                    show = reminderDate.toDateString() === today.toDateString();
                    break;
                case 'upcoming':
                    show = reminderDate >= today;
                    break;
                case 'completed':
                    show = completed;
                    break;
                case 'all':
                default:
                    show = true;
            }
            
            item.style.display = show ? 'flex' : 'none';
        });
    }

    // ===== MUSIC PLAYER =====
    function setupMusicPlayer() {
        const audio = new Audio();
        let currentTrackIndex = 0;
        let tracks = [];
        let isPlaying = false;
        
        // DOM Elements
        const playBtn = document.getElementById('play-btn');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const progressBar = document.getElementById('progress-bar');
        const currentTimeEl = document.getElementById('current-time');
        const durationEl = document.getElementById('duration');
        const volumeSlider = document.getElementById('volume-slider');
        const uploadBtn = document.getElementById('upload-music');
        const fileInput = document.getElementById('file-input');
        const playlist = document.getElementById('playlist');
        const trackTitle = document.getElementById('track-title');
        const trackArtist = document.getElementById('track-artist');
        
        // Upload music
        uploadBtn.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            
            if (files.length === 0) return;
            
            // Clear previous tracks
            tracks = [];
            playlist.innerHTML = '';
            
            // Remove empty message if it exists
            const emptyMsg = playlist.querySelector('.empty-message');
            if (emptyMsg) emptyMsg.remove();
            
            // Add new tracks
            files.forEach((file, index) => {
                const track = {
                    name: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
                    file: URL.createObjectURL(file),
                    index: index
                };
                
                tracks.push(track);
                
                // Add to playlist
                const li = document.createElement('li');
                li.className = 'playlist-item';
                li.textContent = track.name;
                li.dataset.index = index;
                playlist.appendChild(li);
                
                // Play track when clicked
                li.addEventListener('click', () => {
                    currentTrackIndex = index;
                    playTrack();
                });
            });
            
            // Play the first track
            if (tracks.length > 0) {
                currentTrackIndex = 0;
                playTrack();
            }
        });
        
        // Play/Pause button
        playBtn.addEventListener('click', () => {
            if (tracks.length === 0) {
                alert('Please upload music files first');
                return;
            }
            
            if (isPlaying) {
                pauseTrack();
            } else {
                playTrack();
            }
        });
        
        // Previous track
        prevBtn.addEventListener('click', () => {
            if (tracks.length === 0) return;
            
            currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
            playTrack();
        });
        
        // Next track
        nextBtn.addEventListener('click', () => {
            if (tracks.length === 0) return;
            
            currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
            playTrack();
        });
        
        // Progress bar
        progressBar.addEventListener('input', () => {
            const seekTime = (progressBar.value / 100) * audio.duration;
            audio.currentTime = seekTime;
        });
        
        // Volume control
        volumeSlider.addEventListener('input', () => {
            audio.volume = volumeSlider.value / 100;
        });
        
        // Update progress bar as audio plays
        audio.addEventListener('timeupdate', () => {
            if (!isNaN(audio.duration)) {
                const progress = (audio.currentTime / audio.duration) * 100;
                progressBar.value = progress;
                
                // Update time displays
                currentTimeEl.textContent = formatTime(audio.currentTime);
                durationEl.textContent = formatTime(audio.duration);
            }
        });
        
        // When track ends, play next
        audio.addEventListener('ended', () => {
            nextBtn.click();
        });
        
        // Play track function
        function playTrack() {
            const track = tracks[currentTrackIndex];
            audio.src = track.file;
            audio.play();
            isPlaying = true;
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            
            // Update track info
            trackTitle.textContent = track.name;
            trackArtist.textContent = 'Uploaded Track';
            
            // Highlight current track in playlist
            const playlistItems = document.querySelectorAll('.playlist-item');
            playlistItems.forEach(item => {
                item.classList.remove('playing');
                if (parseInt(item.dataset.index) === currentTrackIndex) {
                    item.classList.add('playing');
                }
            });
        }
        
        // Pause track function
        function pauseTrack() {
            audio.pause();
            isPlaying = false;
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
        
        // Format time (seconds to MM:SS)
        function formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }
    }

    // ===== HEALTH CHARTS =====
    function initHealthChart() {
        const ctx = document.getElementById('health-chart').getContext('2d');
        
        if (window.healthChart) {
            window.healthChart.destroy();
        }
        
        // Get health data from localStorage
        const healthData = JSON.parse(localStorage.getItem('healthData')) || [];
        
        // Prepare chart data
        const labels = healthData.map(item => new Date(item.date).toLocaleDateString());
        const weightData = healthData.map(item => item.weight);
        const bpData = healthData.map(item => parseInt(item.bp.split('/')[0])); // Get systolic BP
        
        window.healthChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.length > 0 ? labels : ['No data'],
                datasets: [
                    {
                        label: 'Weight (kg)',
                        data: weightData.length > 0 ? weightData : [0],
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Blood Pressure (Sys)',
                        data: bpData.length > 0 ? bpData : [0],
                        borderColor: '#F44336',
                        backgroundColor: 'rgba(244, 67, 54, 0.1)',
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
        
        // Populate health history table
        const healthTable = document.getElementById('health-history-data');
        
        if (healthData.length === 0) {
            healthTable.innerHTML = '<tr class="empty-message"><td colspan="5">No health data recorded yet</td></tr>';
        } else {
            healthTable.innerHTML = healthData.map(data => `
                <tr>
                    <td>${new Date(data.date).toLocaleDateString()}</td>
                    <td>${data.bp}</td>
                    <td>${data.hr}</td>
                    <td>${data.sugar}</td>
                    <td>${data.weight}</td>
                </tr>
            `).join('');
        }
    }

    function initExerciseChart() {
        const ctx = document.getElementById('exercise-chart').getContext('2d');
        
        if (window.exerciseChart) {
            window.exerciseChart.destroy();
        }
        
        // Get exercise data from localStorage
        const exerciseData = JSON.parse(localStorage.getItem('exerciseData')) || [];
        
        // Group by day of week for chart
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const durationData = [0, 0, 0, 0, 0, 0, 0];
        
        exerciseData.forEach(workout => {
            const day = new Date(workout.date).getDay();
            durationData[day] += parseInt(workout.duration) || 0;
        });
        
        window.exerciseChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: days,
                datasets: [{
                    label: 'Minutes Exercised',
                    data: durationData,
                    backgroundColor: '#4CAF50',
                    borderColor: '#2E7D32',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
        // Populate exercise history table
        const exerciseTable = document.getElementById('exercise-history-data');
        
        if (exerciseData.length === 0) {
            exerciseTable.innerHTML = '<tr class="empty-message"><td colspan="5">No workouts recorded yet</td></tr>';
        } else {
            exerciseTable.innerHTML = exerciseData.map(data => `
                <tr>
                    <td>${new Date(data.date).toLocaleDateString()}</td>
                    <td>${data.exerciseName}</td>
                    <td>${data.exerciseType}</td>
                    <td>${data.duration}</td>
                    <td>${data.calories}</td>
                </tr>
            `).join('');
        }
    }

    function initNutritionChart() {
        const ctx = document.getElementById('nutrition-chart').getContext('2d');
        
        if (window.nutritionChart) {
            window.nutritionChart.destroy();
        }
        
        // Get nutrition data from localStorage
        const nutritionData = JSON.parse(localStorage.getItem('nutritionData')) || [];
        
        // Calculate totals
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;
        
        nutritionData.forEach(meal => {
            totalProtein += parseInt(meal.protein) || 0;
            totalCarbs += parseInt(meal.carbs) || 0;
            totalFat += parseInt(meal.fat) || 0;
        });
        
        // Update UI
        document.getElementById('total-calories').textContent = nutritionData.reduce((sum, meal) => sum + (parseInt(meal.calories) || 0), 0);
        document.getElementById('total-protein').textContent = totalProtein + 'g';
        document.getElementById('total-carbs').textContent = totalCarbs + 'g';
        document.getElementById('total-fat').textContent = totalFat + 'g';
        
        window.nutritionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Protein', 'Carbs', 'Fat'],
                datasets: [{
                    data: [
                        totalProtein > 0 ? totalProtein : 1,
                        totalCarbs > 0 ? totalCarbs : 1,
                        totalFat > 0 ? totalFat : 1
                    ],
                    backgroundColor: [
                        '#4CAF50',
                        '#2196F3',
                        '#FFC107'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // ===== DATA SAVING FUNCTIONS =====
    function saveHealthData() {
        const bp = document.getElementById('blood-pressure').value;
        const hr = document.getElementById('heart-rate').value;
        const sugar = document.getElementById('blood-sugar').value;
        const weight = document.getElementById('weight').value;
        
        if (!bp || !hr || !sugar || !weight) {
            alert('Please fill in all health metrics');
            return;
        }
        
        // Validate blood pressure format
        if (!/^\d+\/\d+$/.test(bp)) {
            alert('Please enter blood pressure in format "120/80"');
            return;
        }
        
        // Save to localStorage
        const healthData = JSON.parse(localStorage.getItem('healthData')) || [];
        healthData.push({
            date: new Date().toISOString(),
            bp,
            hr,
            sugar,
            weight
        });
        localStorage.setItem('healthData', JSON.stringify(healthData));
        
        // Clear form
        document.getElementById('blood-pressure').value = '';
        document.getElementById('heart-rate').value = '';
        document.getElementById('blood-sugar').value = '';
        document.getElementById('weight').value = '';
        
        // Refresh chart and table
        initHealthChart();
        updateDashboardStats();
        
        alert('Health data saved successfully!');
    }

    function showWorkoutPlanDetails() {
        const planSelect = document.getElementById('workout-plan-select');
        const planDetails = document.getElementById('workout-plan-details');
        const selectedPlan = planSelect.value;
        
        if (!selectedPlan) {
            planDetails.innerHTML = '<p class="empty-message">Select a workout plan to see details</p>';
            return;
        }
        
        const plans = {
            beginner: {
                name: 'Beginner Full Body',
                description: 'A full-body workout designed for beginners, focusing on fundamental movements and building a fitness foundation.',
                duration: '30-45 minutes',
                exercises: [
                    'Bodyweight Squats: 3 sets of 10-12 reps',
                    'Push-ups (knees or wall): 3 sets of 8-10 reps',
                    'Bent-over Dumbbell Rows: 3 sets of 10 reps',
                    'Plank: 3 sets of 20-30 seconds',
                    'Glute Bridges: 3 sets of 12 reps'
                ]
            },
            intermediate: {
                name: 'Intermediate Strength',
                description: 'A strength-focused workout for those with some exercise experience, using weights to build muscle.',
                duration: '45-60 minutes',
                exercises: [
                    'Barbell Squats: 4 sets of 8 reps',
                    'Bench Press: 4 sets of 8 reps',
                    'Deadlifts: 3 sets of 6 reps',
                    'Pull-ups: 3 sets to failure',
                    'Overhead Press: 3 sets of 8 reps'
                ]
            },
            advanced: {
                name: 'Advanced HIIT',
                description: 'High-intensity interval training for advanced exercisers looking to improve cardiovascular fitness and burn fat.',
                duration: '20-30 minutes',
                exercises: [
                    'Burpees: 30 seconds on, 30 seconds off (5 rounds)',
                    'Jump Squats: 30 seconds on, 30 seconds off (5 rounds)',
                    'Mountain Climbers: 30 seconds on, 30 seconds off (5 rounds)',
                    'Box Jumps: 30 seconds on, 30 seconds off (5 rounds)',
                    'Battle Ropes: 30 seconds on, 30 seconds off (5 rounds)'
                ]
            },
            yoga: {
                name: 'Yoga Flow',
                description: 'A balanced yoga sequence to improve flexibility, strength, and mindfulness.',
                duration: '45-60 minutes',
                exercises: [
                    'Sun Salutations (Surya Namaskar): 5 rounds',
                    'Warrior Series (I, II, III)',
                    'Tree Pose (Vrksasana)',
                    'Downward Dog (Adho Mukha Svanasana)',
                    'Child\'s Pose (Balasana)'
                ]
            }
        };
        
        const plan = plans[selectedPlan];
        let html = `<h3>${plan.name}</h3>`;
        html += `<p><strong>Duration:</strong> ${plan.duration}</p>`;
        html += `<p>${plan.description}</p>`;
        html += `<h4>Exercises:</h4><ul>`;
        plan.exercises.forEach(ex => html += `<li>${ex}</li>`);
        html += `</ul>`;
        
        planDetails.innerHTML = html;
    }

    function saveWorkout() {
        const exerciseType = document.getElementById('exercise-type').value;
        const exerciseName = document.getElementById('exercise-name').value;
        const duration = document.getElementById('exercise-duration').value;
        const calories = document.getElementById('calories-burned-input').value;
        
        if (!exerciseName || !duration || !calories) {
            alert('Please fill in all workout details');
            return;
        }
        
        // Save to localStorage
        const exerciseData = JSON.parse(localStorage.getItem('exerciseData')) || [];
        exerciseData.push({
            date: new Date().toISOString(),
            exerciseType,
            exerciseName,
            duration,
            calories
        });
        localStorage.setItem('exerciseData', JSON.stringify(exerciseData));
        
        // Clear form
        document.getElementById('exercise-name').value = '';
        document.getElementById('exercise-duration').value = '';
        document.getElementById('calories-burned-input').value = '';
        
        // Refresh chart and table
        initExerciseChart();
        updateDashboardStats();
        
        alert('Workout saved successfully!');
    }

    function saveMeal() {
        const mealType = document.getElementById('meal-type').value;
        const mealName = document.getElementById('meal-name').value;
        const calories = document.getElementById('meal-calories').value;
        const carbs = document.getElementById('meal-carbs').value;
        const protein = document.getElementById('meal-protein').value;
        const fat = document.getElementById('meal-fat').value;
        
        if (!mealName || !calories || !carbs || !protein || !fat) {
            alert('Please fill in all meal details');
            return;
        }
        
        // Save to localStorage
        const nutritionData = JSON.parse(localStorage.getItem('nutritionData')) || [];
        nutritionData.push({
            date: new Date().toISOString(),
            mealType,
            mealName,
            calories,
            carbs,
            protein,
            fat
        });
        localStorage.setItem('nutritionData', JSON.stringify(nutritionData));
        
        // Clear form
        document.getElementById('meal-name').value = '';
        document.getElementById('meal-calories').value = '';
        document.getElementById('meal-carbs').value = '';
        document.getElementById('meal-protein').value = '';
        document.getElementById('meal-fat').value = '';
        
        // Refresh chart
        initNutritionChart();
        updateDashboardStats();
        
        alert('Meal saved successfully!');
    }





    
    // ===== DASHBOARD STATS =====
    function updateDashboardStats() {
        // Calculate active minutes
        const exerciseData = JSON.parse(localStorage.getItem('exerciseData')) || [];
        const activeMinutes = exerciseData.reduce((sum, workout) => sum + (parseInt(workout.duration) || 0), 0);
        document.getElementById('active-minutes').textContent = activeMinutes;
        document.getElementById('active-progress').style.width = `${Math.min(100, (activeMinutes / 60) * 100)}%`;
        
        // Calculate calories burned
        const caloriesBurned = exerciseData.reduce((sum, workout) => sum + (parseInt(workout.calories) || 0), 0);
        document.getElementById('calories-burned').textContent = caloriesBurned;
        document.getElementById('calories-progress').style.width = `${Math.min(100, (caloriesBurned / 500) * 100)}%`;
        
        // Calculate water intake (placeholder - would need separate tracking)
        const waterIntake = 0; // In a real app, this would come from user input
        document.getElementById('water-intake').textContent = waterIntake + 'L';
        document.getElementById('water-progress').style.width = `${Math.min(100, (waterIntake / 2) * 100)}%`;
        
        // Calculate sleep (placeholder - would need separate tracking)
        const sleepHours = 0; // In a real app, this would come from user input
        document.getElementById('sleep-hours').textContent = sleepHours + 'h';
        document.getElementById('sleep-progress').style.width = `${Math.min(100, (sleepHours / 8) * 100)}%`;
    }

    // Clear all scheduled reminders when page closes
    window.addEventListener('beforeunload', () => {
        scheduledReminders.forEach(timeout => clearTimeout(timeout));
    });
});