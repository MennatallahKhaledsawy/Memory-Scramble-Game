// Global State Variables
let timerInterval;
let timeLeft;
let flippedCards = [];
let matchedPairs = 0;
let totalPairs = 0;

// DOM Elements
const startBtn = document.getElementById('start-btn');
const boardElement = document.getElementById('game-board');
const timerDisplay = document.getElementById('timer-display');
const messageDisplay = document.getElementById('message-display');

// Event Listener for Game Start
startBtn.addEventListener('click', initializeGame);

function initializeGame() {
    const rows = parseInt(document.getElementById('rows').value);
    const cols = parseInt(document.getElementById('cols').value);
    timeLeft = parseInt(document.getElementById('time').value);

    // Validation
    if ((rows * cols) % 2 !== 0) {
        alert("Board size (rows * columns) must be an even number!");
        return;
    }

    // Reset state
    clearInterval(timerInterval);
    boardElement.innerHTML = '';
    matchedPairs = 0;
    flippedCards = [];
    messageDisplay.innerText = '';
    
    totalPairs = (rows * cols) / 2;

    generateBoard(rows, cols);
    startTimer();
}

function generateBoard(rows, cols) {
    // Member 2: Generate pairs, shuffle them, and render HTML cells here
}

function handleCardClick(event) {
    // Member 2: Handle flipping logic, storing flipped cards, and checking matches
}

function startTimer() {
    // Member 3: Implement countdown logic and game over state
}