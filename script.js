// Global State Variables
let timerInterval;
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
    // Prevent clicking if board is locked, or if the card is already flipped/matched
    if (lockBoard) return;
    
    const clickedCard = event.currentTarget;
    if (clickedCard.classList.contains('flipped') || clickedCard.classList.contains('matched')) {
        return; 
    }

    // Flip the card to show its actual image
    clickedCard.classList.add('flipped');
    const img = clickedCard.querySelector('img');
    img.src = `images/${clickedCard.dataset.value}.jpeg`; 

    flippedCards.push(clickedCard);

    // If two cards are flipped, check for a match
    if (flippedCards.length === 2) {
        checkForMatch();
    }
}


function startTimer() {
    // 1. Display the starting time immediately so it doesn't wait a second to show up
    timerDisplay.innerText = timeLeft;

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
        // Not a match: wait 1 second, then flip them back over
        setTimeout(() => {
            flippedCards[0].classList.remove('flipped');
            flippedCards[0].querySelector('img').src = 'images/cover.jpg';
            
            flippedCards[1].classList.remove('flipped');
            flippedCards[1].querySelector('img').src = 'images/cover.jpg';
            
            // Display the required game-over message
            messageDisplay.innerText = "Game Over! You ran out of time.";
            messageDisplay.style.color = "red";
        }
    },1000); 
}