let paddle1, paddle2, puck, goalLeft, goalRight, centerLine, centerCircle;
let isPlayer1 = false;
let roomCode = localStorage.getItem("roomCode"); // Get stored room code
let score1 = 0,
  score2 = 0;
let puckMovingToPlayer = 1; // Track which player has the turn
let player1Text, player2Text;

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: {
    preload,
    create,
    update,
  },
};

const game = new Phaser.Game(config);

function preload() {
  this.load.image("paddle", "paddle.png");
  this.load.image("puck", "puck.png");
}

function create() {
  // Add center line
  centerLine = this.add.graphics();
  centerLine.lineStyle(4, 0xffffff, 1);
  centerLine.beginPath();
  centerLine.moveTo(400, 0);
  centerLine.lineTo(400, 600);
  centerLine.strokePath();

  // Add center circle
  centerCircle = this.add.graphics();
  centerCircle.lineStyle(3, 0xffffff, 1);
  centerCircle.strokeCircle(400, 300, 80);

  // Create paddles
  paddle1 = this.physics.add.sprite(100, 300, "paddle").setImmovable();
  paddle2 = this.physics.add.sprite(700, 300, "paddle").setImmovable();

  // Create puck
  puck = this.physics.add
    .sprite(400, 300, "puck")
    .setCollideWorldBounds(true)
    .setBounce(1);
  resetPuck(); // Start the puck towards Player 1

  // Add player name text
  player1Text = this.add
    .text(100, 250, "Player 1", { fontSize: "20px", fill: "#fff" })
    .setOrigin(0.5);
  player2Text = this.add
    .text(700, 250, "Player 2", { fontSize: "20px", fill: "#fff" })
    .setOrigin(0.5);

  // Ensure Player 1 (Creator) is on the Left, and Player 2 (Joiner) is on the Right
  socket.emit("checkPlayer", roomCode);
  socket.on("assignPlayer", ({ playerNumber, playerName, opponentName }) => {
    isPlayer1 = playerNumber === 1;

    if (isPlayer1) {
      paddle1.setPosition(100, 300);
      paddle2.setPosition(700, 300);
      player1Text.setText(`You (${playerName})`);
      player2Text.setText(`Opponent (${opponentName})`);
    } else {
      paddle1.setPosition(100, 300);
      paddle2.setPosition(700, 300);
      player1Text.setText(`Opponent (${opponentName})`);
      player2Text.setText(`You (${playerName})`);
    }
  });

  // Paddle movement with both X and Y
  this.input.on("pointermove", (pointer) => {
    if (isPlayer1) {
      // Player 1 moves within the left half
      paddle1.x = Phaser.Math.Clamp(pointer.x, 50, 400 - 30);
      paddle1.y = Phaser.Math.Clamp(pointer.y, 50, 550);
      socket.emit("movePaddle", {
        roomCode,
        playerId: socket.id,
        paddleX: paddle1.x,
        paddleY: paddle1.y,
      });
    } else {
      // Player 2 moves within the right half
      paddle2.x = Phaser.Math.Clamp(pointer.x, 400 + 30, 750);
      paddle2.y = Phaser.Math.Clamp(pointer.y, 50, 550);
      socket.emit("movePaddle", {
        roomCode,
        playerId: socket.id,
        paddleX: paddle2.x,
        paddleY: paddle2.y,
      });
    }
  });

  // Handle paddle and puck collision
  this.physics.add.collider(paddle1, puck, () => hitPuck(1));
  this.physics.add.collider(paddle2, puck, () => hitPuck(2));

  // Listen for paddle movement
  socket.on("updatePaddle", ({ playerId, paddleX, paddleY }) => {
    if (playerId !== socket.id) {
      if (isPlayer1) {
        paddle2.x = Math.max(paddleX, 400 + 30);
        paddle2.y = paddleY;
      } else {
        paddle1.x = Math.min(paddleX, 400 - 30);
        paddle1.y = paddleY;
      }
    }
  });

  // Listen for puck updates
  socket.on("updatePuck", (puckData) => {
    puck.setPosition(puckData.x, puckData.y);
    puck.setVelocity(puckData.vx, puckData.vy);
  });

  // Define goal areas
  goalLeft = this.add.rectangle(10, 300, 20, 200, 0xff0000).setOrigin(0.5);
  goalRight = this.add.rectangle(790, 300, 20, 200, 0x00ff00).setOrigin(0.5);
  this.physics.world.enable([goalLeft, goalRight]);

  // Detect scoring
  this.physics.add.overlap(puck, goalLeft, () => scoreGoal(2), null, this);
  this.physics.add.overlap(puck, goalRight, () => scoreGoal(1), null, this);
}

function update() {
  player1Text.setPosition(paddle1.x, paddle1.y - 50);
  player2Text.setPosition(paddle2.x, paddle2.y - 50);

  // Only update the puck if this player is in control
  if (isPlayer1 && document.visibilityState === "visible") {
    socket.emit("updatePuck", {
      roomCode,
      puck: {
        x: puck.x,
        y: puck.y,
        vx: puck.body.velocity.x,
        vy: puck.body.velocity.y,
      },
    });
  }
}

// Function to reset the puck and move it towards the player who has the turn
function resetPuck() {
  puck.setPosition(400, 300);
  puck.setVelocity(0, 0);

  if (puckMovingToPlayer === 1) {
    // Move towards Player 1 (room creator / left side)
    puck.setVelocity(-100, (Math.random() - 0.5) * 100);
  } else {
    // Move towards Player 2 (right side)
    puck.setVelocity(100, (Math.random() - 0.5) * 100);
  }
}

// Ensure the puck moves toward Player 1 at the start
socket.on("startGame", () => {
  puckMovingToPlayer = 1; // Always start with Player 1
  resetPuck();
});

// Function to handle puck hit
function hitPuck(player) {
  if (player === 1) {
    puck.setVelocity(200, (Math.random() - 0.5) * 300);
    puckMovingToPlayer = 2;
  } else {
    puck.setVelocity(-200, (Math.random() - 0.5) * 300);
    puckMovingToPlayer = 1;
  }
}

// Function to handle scoring
function scoreGoal(player) {
  if (player === 1) {
    score1++;
    console.log(`Player 1 Scored! Score: ${score1} - ${score2}`);
  } else {
    score2++;
    console.log(`Player 2 Scored! Score: ${score1} - ${score2}`);
  }

  puckMovingToPlayer = player;
  resetPuck();
  socket.emit("updateScore", { roomCode, score1, score2 });
}

// Listen for score updates
socket.on("updateScore", ({ score1, score2 }) => {
  console.log(`Updated Score: ${score1} - ${score2}`);
});










