// Game state
const state = {
    grid: Array(10).fill().map(() => Array(10).fill(0)),
    score: 0,
    level: 1,
    gameOver: false,
    currentPieces: [],
    draggedPiece: null,
    dragOffset: { x: 0, y: 0 },
    colors: ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'],
    lastValidPosition: null,
    comboCount: 0,
    lastComboTime: 0,
    hintTimeout: null
};

// Tetris-like pieces (each piece is an array of [row, col] offsets from the anchor point)
const basicPieces = [
    { shape: [[0, 0], [0, 1], [0, 2], [0, 3]], name: 'I' },  // I-piece
    { shape: [[0, 0], [0, 1], [1, 0], [1, 1]], name: 'O' },  // O-piece
    { shape: [[0, 0], [0, 1], [0, 2], [1, 2]], name: 'L' },  // L-piece
    { shape: [[0, 0], [0, 1], [0, 2], [1, 0]], name: 'J' },  // J-piece
    { shape: [[0, 0], [0, 1], [0, 2], [1, 1]], name: 'T' },  // T-piece
    { shape: [[0, 0], [0, 1], [1, 1], [1, 2]], name: 'Z' },  // Z-piece
    { shape: [[0, 1], [0, 2], [1, 0], [1, 1]], name: 'S' },   // S-piece
    { shape: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]], name: 'W' },  // W-piece
    { shape: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 2]], name: 'U' },  // U-piece
    { shape: [[0, 0], [0, 1], [1, 1], [2, 1], [2, 0]], name: 'C' },  // C-piece
    { shape: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1], [2, 2]], name: 'B' }, // Big block
    { shape: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]], name: '+' },  // Plus-piece
    { shape: [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]], name: 'F' },  // F-piece
    { shape: [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1]], name: 'L4' }, // Long L
    { shape: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 0], [2, 2]], name: 'X' } // X-piece
];

// Advanced pieces that unlock at higher levels
const advancedPieces = [
    
];

// DOM elements
const elements = {
    gameGrid: document.getElementById('game-grid'),
    nextBlocks: document.getElementById('next-blocks'),
    scoreDisplay: document.getElementById('score'),
    levelDisplay: document.getElementById('level'),
    gameOverScreen: document.getElementById('game-over'),
    finalScore: document.getElementById('final-score'),
    finalLevel: document.getElementById('final-level'),
    newGameBtn: document.getElementById('new-game-btn'),
    dragGhost: document.getElementById('drag-ghost'),
    hintBtn: document.getElementById('hint-btn'),
    comboMessage: document.getElementById('combo-message')
};

// Initialize game
function initGame() {
    state.grid = Array(10).fill().map(() => Array(10).fill(0));
    state.score = 0;
    state.level = 1;
    state.gameOver = false;
    state.currentPieces = [];
    state.comboCount = 0;

    // Clear the grid
    elements.gameGrid.innerHTML = '';
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell aspect-square';
            cell.dataset.row = row;
            cell.dataset.col = col;
            elements.gameGrid.appendChild(cell);
        }
    }

    // Add some pre-placed blocks (10-15% of the grid)
    placeInitialBlocks();

    // Generate initial pieces
    generateNewPieces();
    updateScore();
    updateLevel();
    elements.gameOverScreen.classList.add('hidden');
}

// Place some initial blocks on the grid
function placeInitialBlocks() {
    const numBlocks = Math.floor(Math.random() * 6) + 10; // 10-15 blocks
    const colors = [...state.colors];

    for (let i = 0; i < numBlocks; i++) {
        let placed = false;
        let attempts = 0;

        // Try to place a small block (1-4 cells)
        const blockSize = Math.min(Math.floor(Math.random() * 4) + 1, 3);
        const color = colors[Math.floor(Math.random() * colors.length)];

        while (!placed && attempts < 50) {
            attempts++;
            const row = Math.floor(Math.random() * 10);
            const col = Math.floor(Math.random() * 10);

            // Try to place a small cluster
            if (state.grid[row][col] === 0) {
                state.grid[row][col] = 1;
                const cell = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
                cell.classList.add('filled', color, 'pre-placed');

                // Sometimes add adjacent cells
                if (blockSize > 1 && row < 9 && state.grid[row + 1][col] === 0) {
                    state.grid[row + 1][col] = 1;
                    const cell2 = document.querySelector(`.grid-cell[data-row="${row + 1}"][data-col="${col}"]`);
                    cell2.classList.add('filled', color, 'pre-placed');
                }
                if (blockSize > 2 && col < 9 && state.grid[row][col + 1] === 0) {
                    state.grid[row][col + 1] = 1;
                    const cell3 = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col + 1}"]`);
                    cell3.classList.add('filled', color, 'pre-placed');
                }

                placed = true;
            }
        }
    }
}

// Generate new random pieces for the player to place
function generateNewPieces() {
    state.currentPieces = [];
    elements.nextBlocks.innerHTML = '';

    // Determine which pieces to use based on level
    let availablePieces = [...basicPieces];
    if (state.level >= 3) {
        availablePieces = availablePieces.concat(advancedPieces.slice(0, 2));
    }
    if (state.level >= 5) {
        availablePieces = availablePieces.concat(advancedPieces.slice(2, 5));
    }
    if (state.level >= 7) {
        availablePieces = availablePieces.concat(advancedPieces.slice(5));
    }

    // Create 3 random pieces
    for (let i = 0; i < 3; i++) {
        // Higher levels have a chance to get more complex pieces
        let piecePool = availablePieces;
        if (state.level > 5 && Math.random() < 0.3) {
            piecePool = advancedPieces;
        }

        const randomPiece = piecePool[Math.floor(Math.random() * piecePool.length)];
        const color = state.colors[Math.floor(Math.random() * state.colors.length)];
        state.currentPieces.push({
            ...randomPiece,
            color: color
        });

        // Create visual representation of the piece
        const pieceElement = createPieceElement(randomPiece, color);
        pieceElement.dataset.index = i;
        elements.nextBlocks.appendChild(pieceElement);
    }
}

// Create a draggable element for a piece
function createPieceElement(piece, color) {
    const container = document.createElement('div');
    container.className = 'block-piece relative w-20 h-20';

    // Find the max dimensions of the piece to scale it properly
    let maxRow = 0, maxCol = 0;
    piece.shape.forEach(([row, col]) => {
        maxRow = Math.max(maxRow, row);
        maxCol = Math.max(maxCol, col);
    });

    const cellSize = 100 / (Math.max(maxRow, maxCol) + 1);

    // Create cells for each part of the piece
    piece.shape.forEach(([row, col]) => {
        const cell = document.createElement('div');
        cell.className = `absolute ${color} border border-white`;
        cell.style.width = `${cellSize}%`;
        cell.style.height = `${cellSize}%`;
        cell.style.left = `${col * cellSize}%`;
        cell.style.top = `${row * cellSize}%`;
        container.appendChild(cell);
    });

    // Add drag events
    container.addEventListener('mousedown', handleDragStart);
    container.addEventListener('touchstart', handleTouchStart, { passive: false });

    return container;
}

// Handle drag start
function handleDragStart(e) {
    startDrag(e.clientX, e.clientY, e.target.closest('.block-piece'));
    e.preventDefault();
}

// Handle touch start
function handleTouchStart(e) {
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY, e.target.closest('.block-piece'));
    e.preventDefault();
}

// Common drag start logic
function startDrag(clientX, clientY, pieceElement) {
    if (state.gameOver || !pieceElement) return;

    const pieceIndex = parseInt(pieceElement.dataset.index);
    state.draggedPiece = state.currentPieces[pieceIndex];

    // Calculate offset from mouse to piece origin
    const rect = pieceElement.getBoundingClientRect();
    state.dragOffset = {
        x: clientX - rect.left,
        y: clientY - rect.top
    };

    // Hide the original piece while dragging
    pieceElement.style.opacity = '0';

    // Create ghost element
    createDragGhost(clientX, clientY);

    // Add event listeners
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
}

// Handle touch move
function handleTouchMove(e) {
    const touch = e.touches[0];
    handleDragMove({
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => e.preventDefault()
    });
    e.preventDefault();
}

// Create a ghost element that follows the mouse
function createDragGhost(x, y) {
    elements.dragGhost.innerHTML = '';
    elements.dragGhost.className = `absolute z-20 block-preview ${state.draggedPiece.color}`;
    elements.dragGhost.style.left = `${x}px`;
    elements.dragGhost.style.top = `${y}px`;

    // Find the max dimensions of the piece to scale it properly
    let maxRow = 0, maxCol = 0;
    state.draggedPiece.shape.forEach(([row, col]) => {
        maxRow = Math.max(maxRow, row);
        maxCol = Math.max(maxCol, col);
    });

    const size = Math.max(maxRow, maxCol) + 1;
    elements.dragGhost.style.width = `${size * 20}px`;
    elements.dragGhost.style.height = `${size * 20}px`;

    const cellSize = 100 / size;

    // Create cells for the ghost
    state.draggedPiece.shape.forEach(([row, col]) => {
        const cell = document.createElement('div');
        cell.className = `absolute border border-white`;
        cell.style.width = `${cellSize}%`;
        cell.style.height = `${cellSize}%`;
        cell.style.left = `${col * cellSize}%`;
        cell.style.top = `${row * cellSize}%`;
        elements.dragGhost.appendChild(cell);
    });

    elements.dragGhost.classList.remove('hidden');
}

// Handle drag movement
function handleDragMove(e) {
    if (!state.draggedPiece) return;

    e.preventDefault();

    // Update ghost position
    elements.dragGhost.style.left = `${e.clientX - 550}px`;
    elements.dragGhost.style.top = `${e.clientY - 200}px`;

    // Clear previous highlights
    clearPreviewHighlights();

    const gridRect = elements.gameGrid.getBoundingClientRect();
    const gridX = e.clientX - gridRect.left;
    const gridY = e.clientY - gridRect.top;

    // Check if mouse is over the grid
    if (gridX >= 0 && gridX <= gridRect.width &&
        gridY >= 0 && gridY <= gridRect.height) {

        const cellSize = gridRect.width / 10;
        const anchorCol = Math.floor(gridX / cellSize);
        const anchorRow = Math.floor(gridY / cellSize);

        // Check if piece can be placed at this position
        const canPlace = canPlacePiece(state.draggedPiece, anchorRow, anchorCol);

        if (canPlace) {
            state.lastValidPosition = { row: anchorRow, col: anchorCol };
            // Highlight cells where the piece would be placed
            state.draggedPiece.shape.forEach(([row, col]) => {
                const cellRow = anchorRow + row;
                const cellCol = anchorCol + col;
                if (cellRow >= 0 && cellRow < 10 && cellCol >= 0 && cellCol < 10) {
                    const cell = document.querySelector(`.grid-cell[data-row="${cellRow}"][data-col="${cellCol}"]`);
                    if (cell) {
                        cell.classList.add('valid-drop');
                    }
                }
            });
        } else {
            // Show invalid drop area
            state.draggedPiece.shape.forEach(([row, col]) => {
                const cellRow = anchorRow + row;
                const cellCol = anchorCol + col;
                if (cellRow >= 0 && cellRow < 10 && cellCol >= 0 && cellCol < 10) {
                    const cell = document.querySelector(`.grid-cell[data-row="${cellRow}"][data-col="${cellCol}"]`);
                    if (cell) {
                        cell.classList.add('invalid-drop');
                    }
                }
            });
        }
    } else {
        state.lastValidPosition = null;
    }
}

// Handle drag end (drop)
function handleDragEnd(e) {
    if (!state.draggedPiece) return;

    if (e.type === 'touchend') {
        e.preventDefault();
    }

    // Remove ghost
    elements.dragGhost.classList.add('hidden');

    // Show the original piece again
    const pieces = document.querySelectorAll('.block-piece');
    pieces.forEach(piece => piece.style.opacity = '1');

    clearPreviewHighlights();

    // Check if dropped on valid position
    if (state.lastValidPosition) {
        const pieceIndex = Array.from(elements.nextBlocks.children).indexOf(
            document.querySelector(`.block-piece[data-index="${state.draggedPiece ? state.currentPieces.indexOf(state.draggedPiece) : -1}"]`)
        );

        // In handleDragEnd function, update this section:
        if (placePiece(state.draggedPiece, state.lastValidPosition.row, state.lastValidPosition.col, pieceIndex)) {
            // Remove the placed piece from available pieces
            const pieceElement = document.querySelector(`.block-piece[data-index="${pieceIndex}"]`);
            if (pieceElement) pieceElement.remove();

            // Remove the piece from state.currentPieces
            state.currentPieces.splice(pieceIndex, 1);

            // Generate new pieces if we're down to 1 or none
            if (state.currentPieces.length <= 1) {
                generateNewPieces();
            }

            // Check for completed lines
            checkLines();

            // Check if game is over (no valid moves)
            if (isGameOver()) {
                endGame();
            }
        }
    }

    // Clean up
    state.draggedPiece = null;
    state.lastValidPosition = null;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleDragEnd);
}

// Clear all preview highlights
function clearPreviewHighlights() {
    document.querySelectorAll('.grid-cell.valid-drop, .grid-cell.invalid-drop, .hint-highlight').forEach(cell => {
        cell.classList.remove('valid-drop', 'invalid-drop', 'hint-highlight');
    });
}

// Check if a piece can be placed at a specific position
function canPlacePiece(piece, anchorRow, anchorCol) {
    for (const [row, col] of piece.shape) {
        const cellRow = anchorRow + row;
        const cellCol = anchorCol + col;

        // Check if out of bounds
        if (cellRow < 0 || cellRow >= 10 || cellCol < 0 || cellCol >= 10) {
            return false;
        }

        // Check if cell is already occupied
        if (state.grid[cellRow][cellCol] !== 0) {
            return false;
        }
    }
    return true;
}

// Place a piece on the grid
function placePiece(piece, anchorRow, anchorCol, pieceIndex) {
    if (!canPlacePiece(piece, anchorRow, anchorCol)) {
        return false;
    }

    // Mark cells as occupied
    for (const [row, col] of piece.shape) {
        const cellRow = anchorRow + row;
        const cellCol = anchorCol + col;
        state.grid[cellRow][cellCol] = 1;

        // Update visual representation
        const cell = document.querySelector(`.grid-cell[data-row="${cellRow}"][data-col="${cellCol}"]`);
        if (cell) {
            cell.classList.add('filled', piece.color); 
        }
    }

    return true;
}

// Check for completed lines
function checkLines() {
    let linesCleared = 0;
    const now = Date.now();

    // Reset combo if too much time passed since last clear
    if (now - state.lastComboTime > 3000) {
        state.comboCount = 0;
    }
    state.lastComboTime = now;

    // Check horizontal lines
    for (let row = 0; row < 10; row++) {
        if (state.grid[row].every(cell => cell === 1)) {
            clearLine(row, 'horizontal');
            linesCleared++;
        }
    }

    // Check vertical lines
    for (let col = 0; col < 10; col++) {
        let fullColumn = true;
        for (let row = 0; row < 10; row++) {
            if (state.grid[row][col] !== 1) {
                fullColumn = false;
                break;
            }
        }

        if (fullColumn) {
            clearLine(col, 'vertical');
            linesCleared++;
        }
    }

    // Update score and combo
    if (linesCleared > 0) {
        state.comboCount++;

        // Base points
        let points = linesCleared * 10;

        // Combo bonus
        if (state.comboCount > 1) {
            points += Math.pow(2, state.comboCount - 1) * 5;
            showComboMessage(state.comboCount);
        }

        // Level bonus
        points += state.level * 2;

        state.score += points;
        updateScore();

        // Check for level up
        if (state.score >= state.level * 100) {
            state.level++;
            updateLevel();
        }
    }
}

// Show combo message
function showComboMessage(combo) {
    const messages = [
        "",
        "",
        "Double!",
        "Triple!!",
        "Combo!!!",
        "Amazing!!!!",
        "Incredible!!!!!",
        "Unstoppable!!!!!!"
    ];

    const message = combo < messages.length ? messages[combo] : `${combo}x Combo!`;
    elements.comboMessage.textContent = message;
    elements.comboMessage.style.left = `${elements.gameGrid.offsetLeft + elements.gameGrid.offsetWidth / 2}px`;
    elements.comboMessage.style.top = `${elements.gameGrid.offsetTop + elements.gameGrid.offsetHeight / 2}px`;
    elements.comboMessage.classList.remove('hidden');

    setTimeout(() => {
        elements.comboMessage.classList.add('hidden');
    }, 1000);
}

// Clear a line (row or column)
function clearLine(index, direction) {
    if (direction === 'horizontal') {
        // Clear horizontal line
        for (let col = 0; col < 10; col++) {
            state.grid[index][col] = 0;
            const cell = document.querySelector(`.grid-cell[data-row="${index}"][data-col="${col}"]`);
            if (cell) {
                cell.classList.add('line-clear');
                setTimeout(() => {
                    cell.className = 'grid-cell aspect-square';
                    cell.classList.remove('filled', ...state.colors, 'line-clear');
                }, 400);
            }
        }
    } else {
        // Clear vertical line
        for (let row = 0; row < 10; row++) {
            state.grid[row][index] = 0;
            const cell = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${index}"]`);
            if (cell) {
                cell.classList.add('line-clear');
                setTimeout(() => {
                    cell.className = 'grid-cell aspect-square';
                    cell.classList.remove('filled', ...state.colors, 'line-clear');
                }, 400);
            }
        }
    }
}

// Check if game is over (no valid moves left)
function isGameOver() {
    for (const piece of state.currentPieces) {
        // Check all possible positions for this piece
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                if (canPlacePiece(piece, row, col)) {
                    return false; // Found a valid move
                }
            }
        }
    }
    return true; // No valid moves found
}

// End the game
function endGame() {
    state.gameOver = true;
    elements.finalScore.textContent = state.score;
    elements.finalLevel.textContent = state.level;
    elements.gameOverScreen.classList.remove('hidden');
}

// Update score display
function updateScore() {
    elements.scoreDisplay.textContent = state.score;
    elements.scoreDisplay.classList.add('score-pop');
    setTimeout(() => {
        elements.scoreDisplay.classList.remove('score-pop');
    }, 500);
}

// Update level display
function updateLevel() {
    elements.levelDisplay.textContent = state.level;
    elements.levelDisplay.classList.add('score-pop');
    setTimeout(() => {
        elements.levelDisplay.classList.remove('score-pop');
    }, 500);
}

// Show hint for possible placements
function showHint() {
    // Clear any existing hints
    clearPreviewHighlights();

    // Find all valid placements for all current pieces
    const validPlacements = [];

    state.currentPieces.forEach((piece, pieceIndex) => {
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                if (canPlacePiece(piece, row, col)) {
                    validPlacements.push({ pieceIndex, row, col });
                }
            }
        }
    });

    if (validPlacements.length === 0) return;

    // Pick a random valid placement to highlight
    const randomPlacement = validPlacements[Math.floor(Math.random() * validPlacements.length)];
    const piece = state.currentPieces[randomPlacement.pieceIndex];

    // Highlight the cells
    piece.shape.forEach(([row, col]) => {
        const cellRow = randomPlacement.row + row;
        const cellCol = randomPlacement.col + col;
        if (cellRow >= 0 && cellRow < 10 && cellCol >= 0 && cellCol < 10) {
            const cell = document.querySelector(`.grid-cell[data-row="${cellRow}"][data-col="${cellCol}"]`);
            if (cell) {
                cell.classList.add('hint-highlight');
            }
        }
    });

    // Highlight the piece that can be placed there
    const pieceElement = document.querySelector(`.block-piece[data-index="${randomPlacement.pieceIndex}"]`);
    if (pieceElement) {
        pieceElement.classList.add('hint-highlight');
        setTimeout(() => {
            pieceElement.classList.remove('hint-highlight');
        }, 2000);
    }

    // Clear the hint after 2 seconds
    if (state.hintTimeout) clearTimeout(state.hintTimeout);
    state.hintTimeout = setTimeout(clearPreviewHighlights, 2000);
}

// Event listeners
elements.newGameBtn.addEventListener('click', initGame);
elements.hintBtn.addEventListener('click', showHint);

// Initialize the game
initGame();