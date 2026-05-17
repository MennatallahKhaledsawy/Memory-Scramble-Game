// Game Constants
// Magic numbers and asset paths kept together so they are easy to tweak.
const FLIP_BACK_DELAY_MS = 1000;
const BOARD_GAP_PX = 10;

// Card categories
// Each category is either a list of image paths or a list of emoji that
// the back face renders. Add a new category by dropping a new entry here
// and a matching <option> in index.html - no other code change required.
const CATEGORIES = {
    food: {
        type: 'image',
        items: Array.from({ length: 10 }, (_, i) => `images/${i}.jpeg`),
    },
    animals: {
        type: 'image',
        items: [
            'images/animals/dog.jpg',
            'images/animals/cat.jpg',
            'images/animals/lion.jpg',
            'images/animals/tiger.jpg',
            'images/animals/bear.jpg',
            'images/animals/panda.jpg',
            'images/animals/koala.jpg',
            'images/animals/fox.jpg',
            'images/animals/rabbit.jpg',
            'images/animals/hamster.jpg',
        ],
    },
};

// Sound Effects (Web Audio API)
// Synthesized on the fly so we don't ship any audio files. The
// AudioContext is created lazily on first use because browsers block
// audio until the user has interacted with the page - by the time any
// SFX fires the player has already clicked Start or a card, so that
// gesture requirement is always met.
let audioCtx = null;
function getAudioCtx() {
    if (!audioCtx) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        audioCtx = Ctor ? new Ctor() : null;
    }
    return audioCtx;
}

// Play one short tone. Each note runs through a gain node with a quick
// attack and exponential release so the sounds feel like little blips
// instead of harsh on/off clicks.
function playTone(freq, durationMs, type = 'sine', gain = 0.15, startOffsetMs = 0) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const startAt = ctx.currentTime + startOffsetMs / 1000;
    const stopAt = startAt + durationMs / 1000;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0.0001, startAt);
    env.gain.linearRampToValueAtTime(gain, startAt + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    osc.connect(env).connect(ctx.destination);
    osc.start(startAt);
    osc.stop(stopAt + 0.05);
}

// Match: pleasant rising two-note chirp (C5 -> E5).
function playMatchSfx() {
    playTone(523.25, 120, 'sine', 0.18);
    playTone(659.25, 160, 'sine', 0.18, 100);
}
// Wrong: short low square-wave buzz (G3).
function playWrongSfx() {
    playTone(196.00, 220, 'square', 0.10);
}
// Win: ascending arpeggio C5 E5 G5 C6.
function playWinSfx() {
    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
        playTone(f, 200, 'triangle', 0.2, i * 130);
    });
}
// Lose: slow descending sawtooth A4 -> F#4 -> D4.
function playLoseSfx() {
    [440.00, 369.99, 293.66].forEach((f, i) => {
        playTone(f, 280, 'sawtooth', 0.14, i * 200);
    });
}

// Global State Variables
let timerInterval = null;
let flipBackTimeout = null;
let timeLeft;
let flippedCards = [];
let matchedPairs = 0;
let totalPairs = 0;
let lockBoard = false;
// The category chosen for the current game (set in initializeGame, used by
// generateBoard to pick image vs emoji items for the card backs).
let activeCategory = CATEGORIES.food;

// DOM Elements
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const boardElement = document.getElementById('game-board');
const timerDisplay = document.getElementById('timer-display');
const messageDisplay = document.getElementById('message-display');
const errorDisplay = document.getElementById('error-message');
const matchesEl = document.getElementById('matches');
const totalEl = document.getElementById('total');
const categorySelect = document.getElementById('category');

// Show a validation error inline next to the config inputs.
// Using textContent (not innerHTML) keeps user input from being interpreted as HTML.
function showError(message) {
    errorDisplay.textContent = message;
}

// Event Listeners for Game Start and Reset
// Reset just replays initializeGame() with whatever values are currently
// in the inputs, so the player can restart without re-typing them.
startBtn.addEventListener('click', initializeGame);
resetBtn.addEventListener('click', initializeGame);

// Difficulty preset dropdown
// Picking Easy / Medium / Hard reads the rows / cols / time from the
// option's data attributes, fills the inputs, and starts a new game.
// The "Custom" option carries no data attributes and is a no-op so the
// player can keep tweaking the inputs manually.
document.getElementById('difficulty').addEventListener('change', (event) => {
    const opt = event.target.selectedOptions[0];
    if (!opt || !opt.dataset.rows) return;
    document.getElementById('rows').value = opt.dataset.rows;
    document.getElementById('cols').value = opt.dataset.cols;
    document.getElementById('time').value = opt.dataset.time;
    initializeGame();
});

function initializeGame() {
    const rows = parseInt(document.getElementById('rows').value);
    const cols = parseInt(document.getElementById('cols').value);
    const time = parseInt(document.getElementById('time').value);
    // Pick up the chosen category (falls back to food if the option is
    // somehow unknown - keeps the game playable even with stale HTML).
    activeCategory = CATEGORIES[categorySelect.value] || CATEGORIES.food;
    const maxPairs = activeCategory.items.length;

    // Validation
    // Reject anything outside sensible ranges, and reject boards that would
    // need more pairs than the active category supplies (which used to
    // silently break matching because the same item would appear in 4+ cards).
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
    if ((rows * cols) / 2 > maxPairs) {
        showError(`Board too large: this category only has ${maxPairs} unique items (max ${maxPairs * 2} cards).`);
        return;
    }
    showError('');

    // Reset state
    // Cancel any in-flight timers from the previous game so a pending
    // flip-back or countdown tick cannot mutate the new board mid-game.
    clearInterval(timerInterval);
    clearTimeout(flipBackTimeout);
    flipBackTimeout = null;
    boardElement.replaceChildren();
    matchedPairs = 0;
    flippedCards = [];
    lockBoard = false;
    messageDisplay.innerText = '';
    messageDisplay.className = 'message';
    timeLeft = time;

    totalPairs = (rows * cols) / 2;

    // Refresh the live score readout and reveal the reset button now that
    // a game is actually running.
    matchesEl.textContent = '0';
    totalEl.textContent = String(totalPairs);
    resetBtn.hidden = false;

    generateBoard(rows, cols);
    startTimer();
}
function generateBoard(rows, cols) {
    // 1. Set up the CSS Grid dynamically based on user input
    // Hand the row/column counts to CSS via custom properties; the .board
    // class in style.css reads them and the actual grid rules live there.
    boardElement.style.setProperty('--rows', rows);
    boardElement.style.setProperty('--cols', cols);
    boardElement.style.setProperty('--gap', `${BOARD_GAP_PX}px`);

    // 2. Create the pairs of item IDs (indices into the active category)
    // We use % items.length so if a board ever exceeds the category size
    // (shouldn't happen thanks to validation, but just in case) the items
    // repeat safely instead of producing undefined card backs.
    const items = activeCategory.items;
    let cardValues = [];
    for (let i = 0; i < totalPairs; i++) {
        let itemId = i % items.length;
        cardValues.push(itemId, itemId);
    }

    // 3. Shuffle the cards (Fisher-Yates Shuffle)
    for (let i = cardValues.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cardValues[i], cardValues[j]] = [cardValues[j], cardValues[i]];
    }

    // 4. Create the HTML elements for each card
    // Each card is a perspective container with an inner flipper that
    // holds a front face (cover) and a back face (the real image). The
    // CSS rotates the inner element when the .flipped class is added,
    // so the click handler no longer has to swap any img sources.
    for (let i = 0; i < cardValues.length; i++) {
        const card = document.createElement('div');
        card.classList.add('card');

        // Store the value (0-9) in a data attribute to check matches later
        card.dataset.value = cardValues[i];

        const inner = document.createElement('div');
        inner.classList.add('card__inner');

        // Front face is purely CSS-styled (gradient + "?" via ::before),
        // so we no longer load images/cover.jpg per card.
        const front = document.createElement('div');
        front.classList.add('card__face', 'card__face--front');

        // Back face: render an <img> for image categories, or the emoji
        // glyph as text for emoji categories. textContent (never innerHTML)
        // keeps any future user-supplied label safe from HTML injection.
        const back = document.createElement('div');
        back.classList.add('card__face', 'card__face--back');
        if (activeCategory.type === 'image') {
            const backImg = document.createElement('img');
            backImg.src = activeCategory.items[cardValues[i]];
            backImg.alt = '';
            back.appendChild(backImg);
        } else {
            back.classList.add('card__face--emoji');
            back.textContent = activeCategory.items[cardValues[i]];
        }

        inner.appendChild(front);
        inner.appendChild(back);
        card.appendChild(inner);
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
    // The CSS .flipped rule rotates the inner element; the back face image
    // was already set when the card was created, so no src swap is needed.
    clickedCard.classList.add('flipped');

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
        matchesEl.textContent = String(matchedPairs);
        flippedCards = []; // Reset for the next turn
        lockBoard = false; // Unlock board

        // Check if the game is won
        // On the final match we skip the match-chirp and only play the
        // win arpeggio, so the two SFX don't stack on top of each other.
        if (matchedPairs === totalPairs) {
            clearInterval(timerInterval);
            messageDisplay.innerText = "Congratulations! You found all matches!";
            messageDisplay.className = 'message message--win';
            playWinSfx();
        } else {
            playMatchSfx();
        }
    } else {
        // Not a match: play the wrong-buzz, then wait a moment and flip
        // the cards back over. Capture the timeout id so initializeGame()
        // can cancel it if the player starts a new game before the cards
        // flip back.
        playWrongSfx();
        flipBackTimeout = setTimeout(() => {
            flippedCards[0].classList.remove('flipped');
            flippedCards[1].classList.remove('flipped');

            flippedCards = [];
            lockBoard = false; // Unlock board
            flipBackTimeout = null;
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
            messageDisplay.className = 'message message--lose';
            playLoseSfx();
        }
    }, 1000);
}