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
    // 1. Set up the CSS Grid dynamically based on user input
    boardElement.style.display = 'grid';
    boardElement.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    boardElement.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    boardElement.style.gap = '10px';

    // 2. Create the pairs of image IDs
    let cardValues = [];
    for (let i = 0; i < totalPairs; i++) {
        // We use % 10 so if the user makes a board larger than 20 cards, 
        // the images (0-9) will safely repeat without crashing the game.
        let imageId = i % 10; 
        cardValues.push(imageId, imageId);
    }

    // 3. Shuffle the cards (Fisher-Yates Shuffle)
    for (let i = cardValues.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cardValues[i], cardValues[j]] = [cardValues[j], cardValues[i]];
    }

    // 4. Create the HTML elements for each card
    for (let i = 0; i < cardValues.length; i++) {
        const card = document.createElement('div');
        card.classList.add('card');
        
        // Store the value (0-9) in a data attribute to check matches later
        card.dataset.value = cardValues[i];
        
        const img = document.createElement('img');
        img.src = 'images/cover.jpg'; // All cards start face-down
        img.style.width = '100%'; // Ensure it fits the grid cell
        img.style.cursor = 'pointer';
        
        card.appendChild(img);
        card.addEventListener('click', handleCardClick);
        boardElement.appendChild(card);
    }
}

function handleCardClick(event) {
    // Member 2: Handle flipping logic, storing flipped cards, and checking matches
}

function startTimer() {
    // Member 3: Implement countdown logic and game over state
}