// Game Constants
// Magic numbers and asset paths kept together so they are easy to tweak.
const FLIP_BACK_DELAY_MS = 1000;
const BOARD_GAP_PX = 10;
const AVAILABLE_IMAGES = 10;
const COVER_IMAGE = 'images/cover.jpg';
const cardImageSrc = (id) => `images/${id}.jpeg`;

// Global State Variables
let timerInterval = null;
let timeLeft;
let flippedCards = [];
let matchedPairs = 0;
let totalPairs = 0;
let lockBoard = false;

// DOM Elements
const startBtn = document.getElementById('start-btn');
const boardElement = document.getElementById('game-board');
const timerDisplay = document.getElementById('timer-display');
const messageDisplay = document.getElementById('message-display');
const errorDisplay = document.getElementById('error-message');

// Show a validation error inline next to the config inputs.
// Using textContent (not innerHTML) keeps user input from being interpreted as HTML.
function showError(message) {
    errorDisplay.textContent = message;
}

// Event Listener for Game Start
startBtn.addEventListener('click', initializeGame);

function initializeGame() {
    const rows = parseInt(document.getElementById('rows').value);
    const cols = parseInt(document.getElementById('cols').value);
    const time = parseInt(document.getElementById('time').value);

    // Validation
    // Reject anything outside sensible ranges, and reject boards that would
    // need more pairs than we have images for (which used to silently break
    // matching because the same imageId would appear in 4+ cards).
    if (!Number.isFinite(rows) || !Number.isFinite(cols) || !Number.isFinite(time)) {
        showError("Please fill in rows, columns, and timeout with numbers.");
        return;
    }
    if (rows < 2 || rows > 10 || cols < 2 || cols > 10) {
        showError("Rows and columns must be between 2 and 10.");
        return;
    }
    if (time < 10 || time > 600) {
        showError("Timeout must be between 10 and 600 seconds.");
        return;
    }
    if ((rows * cols) % 2 !== 0) {
        showError("Board size (rows * columns) must be an even number!");
        return;
    }
    if ((rows * cols) / 2 > AVAILABLE_IMAGES) {
        showError(`Board too large: only ${AVAILABLE_IMAGES} unique images available (max ${AVAILABLE_IMAGES * 2} cards).`);
        return;
    }
    showError('');

    // Reset state
    clearInterval(timerInterval);
    boardElement.replaceChildren();
    matchedPairs = 0;
    flippedCards = [];
    messageDisplay.innerText = '';
    timeLeft = time;

    totalPairs = (rows * cols) / 2;

    generateBoard(rows, cols);
    startTimer();
}
function generateBoard(rows, cols) {
    // 1. Set up the CSS Grid dynamically based on user input
    boardElement.style.display = 'grid';
    boardElement.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    boardElement.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    boardElement.style.gap = `${BOARD_GAP_PX}px`;

    // 2. Create the pairs of image IDs
    let cardValues = [];
    for (let i = 0; i < totalPairs; i++) {
        // We use % AVAILABLE_IMAGES so if the user makes a board larger than 20 cards,
        // the images (0-9) will safely repeat without crashing the game.
        let imageId = i % AVAILABLE_IMAGES;
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
        img.src = COVER_IMAGE; // All cards start face-down
        img.style.width = '100%'; // Ensure it fits the grid cell
        img.style.cursor = 'pointer';
        
        card.appendChild(img);
        card.addEventListener('click', handleCardClick);
        boardElement.appendChild(card);
    }
}

function handleCardClick(event) {
    // Prevent clicking if board is locked, or if the card is already flipped/matched
    if (lockBoard) return;
    
    const clickedCard = event.currentTarget;
    if (clickedCard.classList.contains('flipped') || clickedCard.classList.contains('matched')) {
        return; 
    }

    // Flip the card to show its actual image
    clickedCard.classList.add('flipped');
    const img = clickedCard.querySelector('img');
    img.src = cardImageSrc(clickedCard.dataset.value);

    flippedCards.push(clickedCard);

    // If two cards are flipped, check for a match
    if (flippedCards.length === 2) {
        checkForMatch();
    }
}
function checkForMatch() {
    lockBoard = true; 

    let isMatch = flippedCards[0].dataset.value === flippedCards[1].dataset.value;

    if (isMatch) {
        
        flippedCards[0].classList.add('matched');
        flippedCards[1].classList.add('matched');
        matchedPairs++;
        flippedCards = []; // Reset for the next turn
        lockBoard = false; // Unlock board

        // Check if the game is won
        if (matchedPairs === totalPairs) {
            clearInterval(timerInterval); 
            messageDisplay.innerText = "Congratulations! You found all matches!";
            messageDisplay.style.color = "green";
        }
    } else {
        // Not a match: wait a moment, then flip them back over
        setTimeout(() => {
            flippedCards[0].classList.remove('flipped');
            flippedCards[0].querySelector('img').src = COVER_IMAGE;

            flippedCards[1].classList.remove('flipped');
            flippedCards[1].querySelector('img').src = COVER_IMAGE;

            flippedCards = [];
            lockBoard = false; // Unlock board
        }, FLIP_BACK_DELAY_MS);
    }
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
            lockBoard = true;

            // Display the required game-over message
            messageDisplay.innerText = "Game Over! You ran out of time.";
            messageDisplay.style.color = "red";
        }
    }, 1000);
}