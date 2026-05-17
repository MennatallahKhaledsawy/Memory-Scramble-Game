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
    // 1. Display the starting time immediately so it doesn't wait a second to show up
    timerDisplay.innerText = timeLeft;

    // 2. Start the countdown loop
    timerInterval = setInterval(() => {
        timeLeft--; // Subtract 1 second
        timerDisplay.innerText = timeLeft; // Update the HTML screen

        // 3. Check for Game Over condition
        if (timeLeft <= 0) {
            clearInterval(timerInterval); // Stop the clock from counting into negative numbers
            
            // Lock the board so the player can't click any more cards
            
            if (typeof lockBoard !== 'undefined') {
                lockBoard = true; 
            }
            
            // Display the required game-over message
            messageDisplay.innerText = "Game Over! You ran out of time.";
            messageDisplay.style.color = "red";
        }
    },1000); 
}