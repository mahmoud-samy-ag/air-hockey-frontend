class Example extends Phaser.Scene {
  constructor() {
    super();
    this.socket = null;
    this.player1Score = 0;
    this.player2Score = 0;
    this.playerNumber = null;
    this.isPlayerReady = true; // Set to true for local testing
    // Create beep sounds using Web Audio API
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    // Base hit sound (lower pitch)
    const baseBuffer = audioContext.createBuffer(
      1,
      audioContext.sampleRate * 0.1,
      audioContext.sampleRate
    );
    const baseData = baseBuffer.getChannelData(0);
    for (let i = 0; i < baseBuffer.length; i++) {
      baseData[i] =
        Math.sin((330 * Math.PI * 2 * i) / audioContext.sampleRate) *
        Math.exp((-4 * i) / baseBuffer.length);
    }
    // Paddle hit sound (higher pitch)
    const paddleBuffer = audioContext.createBuffer(
      1,
      audioContext.sampleRate * 0.05,
      audioContext.sampleRate
    );
    const paddleData = paddleBuffer.getChannelData(0);
    for (let i = 0; i < paddleBuffer.length; i++) {
      paddleData[i] =
        Math.sin((660 * Math.PI * 2 * i) / audioContext.sampleRate) *
        Math.exp((-8 * i) / paddleBuffer.length);
    }
    this.baseHitSound = baseBuffer;
    this.paddleHitSound = paddleBuffer;
    this.audioContext = null;
    this.leftSwitchOn = false; // Oncogene switch starts OFF (standard position)
    this.rightSwitchOn = true; // Tumor suppressor switch starts ON (standard position)
  }

  preload() {
    this.load.image(
      "background",
      "https://play.rosebud.ai/assets/night_02.png?lmty"
    );

    // Add connection status text
    this.connectionStatus = this.add
      .text(400, 300, "Waiting for opponent...", {
        fontSize: "24px",
        fill: "#ffffff",
      })
      .setOrigin(0.5)
      .setVisible(false);

    if (typeof io !== "undefined") {
      this.socket = io("127.0.0.1:3000/");


      const urlParams = new URLSearchParams(window.location.search);
      const roomId = urlParams.get('room_id') || `room_${Date.now()}`;
      const playerNumber = urlParams.get('player_number') || 1;

      this.socket.emit("createRoom", {
          room_id: roomId,
          player_number: playerNumber
      });

      // In preload function:
      this.socket.on("provideInitialState", () => {
        this.socket.emit("sendInitialState", {
          puck: {
            x: this.puck.x,
            y: this.puck.y,
            velocityX: this.puck.body.velocity.x,
            velocityY: this.puck.body.velocity.y,
          },
          scores: {
            player1: this.player1Score,
            player2: this.player2Score,
          },
        });
      });

      this.socket.on("receiveInitialState", (state) => {
        this.puck.setPosition(state.puck.x, state.puck.y);
        this.puck.setVelocity(state.puck.velocityX, state.puck.velocityY);
        this.player1Score = state.scores.player1;
        this.player2Score = state.scores.player2;
        this.player1ScoreText.setText(this.player1Score.toString());
        this.player2ScoreText.setText(this.player2Score.toString());
      });

      this.socket.on("puckSync", (data) => {
        if (!this.isPlayerReady) return;
        this.puck.setPosition(data.x, data.y);
        this.puck.setVelocity(data.velocityX, data.velocityY);
      });

      this.socket.on("scoreSync", (scores) => {
        this.player1Score = scores.player1;
        this.player2Score = scores.player2;

        if (this.player1ScoreText) {
          this.player1ScoreText.setText(this.player1Score.toString());
        }

        if (this.player2ScoreText) {
          this.player2ScoreText.setText(this.player2Score.toString());
        }
      });

      

      this.socket.on("playerNumber", (num) => {
        this.playerNumber = num;
        this.connectionStatus.setText(
          `Connected as Player ${num}\nWaiting for opponent...`
        );
        this.connectionStatus.setVisible(true);
      });

      this.socket.on("gameStart", () => {
        this.connectionStatus.setVisible(false);
        this.isPlayerReady = true;
      });

      this.socket.on("opponentMove", (data) => {
        if (this.playerNumber === 1) {
          this.paddle2.setPosition(data.x, data.y);
        } else {
          this.paddle1.setPosition(data.x, data.y);
        }
      });

      this.socket.on("opponentDisconnected", () => {
        this.connectionStatus
          .setText("Opponent disconnected!\nWaiting for new player...")
          .setVisible(true);
        this.isPlayerReady = false;
        this.time.delayedCall(3000, () => {
          this.scene.restart();
        });
      });
    } else {
      console.warn("Socket.IO not available - running in local mode");
      this.playerNumber = 1;
    }
  }

  create() {
    this.input.on("pointerdown", () => {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
        // Initialize your audio buffers here
      }
    });

    // Add background
    const background = this.add.image(400, 300, "background");
    background.setDisplaySize(800, 600);
    background.setTint(0x000033); // Dark blue tint for arcade feel

    // Create the table surface
    const tableSurface = this.add.graphics();
    tableSurface.fillStyle(0x000066, 0.5); // Semi-transparent dark blue
    tableSurface.fillRect(50, 50, 700, 500);

    // Create glowing effects
    const glowFX = this.add.graphics();

    // Outer glow (first layer)
    glowFX.lineStyle(6, 0x0033ff, 0.3);
    glowFX.strokeRect(48, 48, 704, 504);

    // Main table border (neon effect)
    const table = this.add.graphics();
    table.lineStyle(4, 0x00ffff, 1); // Cyan color for neon effect
    table.strokeRect(50, 50, 700, 500);

    // Center line glow effect
    glowFX.lineStyle(4, 0x0033ff, 0.3);
    glowFX.beginPath();
    glowFX.moveTo(400, 50);
    glowFX.lineTo(400, 550);
    glowFX.strokePath();
    // Main center line
    table.lineStyle(2, 0x00ffff, 1);
    table.beginPath();
    table.moveTo(400, 50);
    table.lineTo(400, 550);
    table.strokePath();
    // Center circle glow
    glowFX.strokeCircle(400, 300, 52);

    // Main center circle
    table.strokeCircle(400, 300, 50);

    // Goal areas with glow effect
    // Create goal switches
    this.goalLeft = this.add.container(50, 300);
    this.goalRight = this.add.container(750, 300);

    const createSwitch = (isLeft) => {
      const outerGlow = this.add.graphics();
      const switchBase = this.add.graphics();
      const switchInner = this.add.graphics();
      const switchLever = this.add.graphics();
      const leverGlow = this.add.graphics();

      // Create goal post effect
      outerGlow.lineStyle(16, 0xff3366, 0.2);
      outerGlow.strokeRoundedRect(-30, -65, 60, 130, 30);

      // Main goal post
      switchBase.lineStyle(6, 0xff3366, 0.8);
      switchBase.fillStyle(0x220011, 0.9);
      switchBase.fillRoundedRect(-25, -60, 50, 120, 25);
      switchBase.strokeRoundedRect(-25, -60, 50, 120, 25);

      // Inner goal detail
      switchInner.lineStyle(3, 0xff3366, 0.4);
      switchInner.fillStyle(0x330011, 0.6);
      switchInner.fillRoundedRect(-20, -55, 40, 110, 20);
      switchInner.strokeRoundedRect(-20, -55, 40, 110, 20);

      // Goal stripes
      switchInner.lineStyle(2, 0xff3366, 0.3);
      for (let i = -45; i <= 45; i += 15) {
        switchInner.beginPath();
        switchInner.moveTo(-15, i);
        switchInner.lineTo(15, i);
        switchInner.strokePath();
      }

      // Inner red zone (goal detection area)
      const goalZone = this.add.graphics();
      goalZone.fillStyle(0xff3366, 0.15);
      goalZone.fillRoundedRect(-15, -45, 30, 90, 15);

      // Lever part
      switchLever.lineStyle(4, 0xff3366, 1);
      switchLever.fillStyle(0xff3366, 0.9);

      // Create pill-shaped lever
      switchLever.beginPath();
      switchLever.arc(-5, -25, 6, 0, Math.PI * 2, false);
      switchLever.arc(-5, 25, 6, 0, Math.PI * 2, false);
      switchLever.fillPath();
      switchLever.strokePath();

      // Lever body
      switchLever.fillRoundedRect(-11, -25, 12, 50, 6);
      switchLever.strokeRoundedRect(-11, -25, 12, 50, 6);

      // Add metallic highlight
      switchLever.lineStyle(2, 0xff6b8e, 0.6);
      switchLever.beginPath();
      switchLever.moveTo(-8, -20);
      switchLever.lineTo(-8, 20);
      switchLever.strokePath();

      // Outer glow effect (larger for more spread)
      outerGlow.lineStyle(12, 0xff3366, 0.15);
      outerGlow.strokeRoundedRect(-25, -60, 50, 120, 25);

      // Secondary glow
      outerGlow.lineStyle(8, 0xff3366, 0.2);
      outerGlow.strokeRoundedRect(-20, -55, 40, 110, 20);

      // Base of the switch (metallic look)
      switchBase.lineStyle(4, 0xff3366, 0.8);
      switchBase.fillStyle(0x220011, 0.9);
      switchBase.fillRoundedRect(-15, -50, 30, 100, 15);
      switchBase.strokeRoundedRect(-15, -50, 30, 100, 15);

      // Inner base detail
      switchInner.lineStyle(2, 0xff3366, 0.4);
      switchInner.fillStyle(0x330011, 0.6);
      switchInner.fillRoundedRect(-12, -47, 24, 94, 12);
      switchInner.strokeRoundedRect(-12, -47, 24, 94, 12);

      // Decorative lines in base
      switchInner.lineStyle(1, 0xff3366, 0.3);
      for (let i = -40; i <= 40; i += 10) {
        switchInner.beginPath();
        switchInner.moveTo(-10, i);
        switchInner.lineTo(10, i);
        switchInner.strokePath();
      }

      // Lever glow
      leverGlow.lineStyle(8, 0xff3366, 0.2);
      leverGlow.strokeRoundedRect(-14, -42, 28, 84, 14);

      // Main lever
      switchLever.lineStyle(3, 0xff3366, 1);
      switchLever.fillStyle(0xff3366, 0.9);

      // Create detailed lever shape
      switchLever.beginPath();
      // Top cap
      switchLever.arc(-5, -35, 8, 0, Math.PI * 2, false);
      switchLever.fillPath();
      switchLever.strokePath();

      // Bottom cap
      switchLever.beginPath();
      switchLever.arc(-5, 35, 8, 0, Math.PI * 2, false);
      switchLever.fillPath();
      switchLever.strokePath();

      // Main lever body
      switchLever.fillRoundedRect(-13, -35, 16, 70, 8);
      switchLever.lineStyle(3, 0xff3366, 1);
      switchLever.strokeRoundedRect(-13, -35, 16, 70, 8);

      // Lever detail lines
      switchLever.lineStyle(1, 0xff1a1a, 0.5);
      switchLever.beginPath();
      switchLever.moveTo(-9, -30);
      switchLever.lineTo(-9, 30);
      switchLever.strokePath();
      switchLever.beginPath();
      switchLever.moveTo(-5, -30);
      switchLever.lineTo(-5, 30);
      switchLever.strokePath();

      // Add metallic effect to lever using multiple layers
      switchLever.fillStyle(0xff6b8e, 0.8);
      switchLever.fillRoundedRect(-12, -35, 14, 70, 7);
      switchLever.fillStyle(0xff3366, 0.6);
      switchLever.fillRoundedRect(-10, -32, 10, 64, 5);
      switchLever.fillStyle(0xff6b8e, 0.4);
      switchLever.fillRoundedRect(-8, -30, 8, 60, 4);

      const switchComponents = {
        base: switchBase,
        lever: switchLever,
        glow: leverGlow,
      };
      if (isLeft) {
        this.goalLeft.add([
          switchComponents.base,
          switchComponents.glow,
          switchComponents.lever,
        ]);
        this.leftLever = switchComponents.lever;
      } else {
        this.goalRight.add([
          switchComponents.base,
          switchComponents.glow,
          switchComponents.lever,
        ]);
        this.rightLever = switchComponents.lever;
      }
      return switchComponents;
    };
    createSwitch(true); // Create left switch
    createSwitch(false); // Create right switch

    // Set initial positions (instead of rotation)
    this.leftLever.x = -10; // Start on left side (off position)
    this.rightLever.x = 10; // Start on right side (on position)
    // Set initial levers color to green (both activated)
    const initLever = (lever) => {
      lever.clear();
      lever.lineStyle(3, 0x00ff00, 1);
      lever.fillStyle(0x00ff00, 1);
      lever.beginPath();
      lever.arc(-5, -35, 7, 0, Math.PI * 2, false);
      lever.arc(-5, 35, 7, 0, Math.PI * 2, false);
      lever.fillPath();
      lever.strokePath();
      lever.fillRoundedRect(-12, -35, 14, 70, 7);
      lever.strokeRoundedRect(-12, -35, 14, 70, 7);
    };

    // Set initial lever colors
    // Initialize levers with correct colors based on initial states
    const updateLeverColor = (lever, isOn) => {
      const color = isOn ? 0x00ff00 : 0xff0000;
      lever.clear();
      lever.lineStyle(3, color, 1);
      lever.fillStyle(color, 1);
      lever.beginPath();
      lever.arc(-5, -35, 7, 0, Math.PI * 2, false);
      lever.arc(-5, 35, 7, 0, Math.PI * 2, false);
      lever.fillPath();
      lever.strokePath();
      lever.fillRoundedRect(-12, -35, 14, 70, 7);
      lever.strokeRoundedRect(-12, -35, 14, 70, 7);
    };

    // Set initial colors based on starting states
    updateLeverColor(this.leftLever, false); // Oncogene starts OFF (red)
    updateLeverColor(this.rightLever, true); // Tumor suppressor starts ON (green)
    this.rightLever.fillStyle(0x00ff00, 1);
    this.rightLever.beginPath();
    this.rightLever.arc(-5, -35, 7, 0, Math.PI * 2, false);
    this.rightLever.arc(-5, 35, 7, 0, Math.PI * 2, false);
    this.rightLever.fillPath();
    this.rightLever.strokePath();
    this.rightLever.fillRoundedRect(-12, -35, 14, 70, 7);
    this.rightLever.strokeRoundedRect(-12, -35, 14, 70, 7);

    // Add base labels
    this.add
      .text(175, 575, "Oncogene", {
        fontSize: "20px",
        fill: "#00ffff",
        align: "center",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.add
      .text(625, 575, "Tumor\nsuppressor gene", {
        fontSize: "20px",
        fill: "#ff3366",
        align: "center",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    // Add CANCER texts for both sides
    this.cancerTextRight = this.add
      .text(625, 35, "CANCER", {
        fontSize: "32px",
        fill: "#ff0000",
        align: "center",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.cancerTextLeft = this.add
      .text(175, 35, "CANCER", {
        fontSize: "32px",
        fill: "#ff0000",
        align: "center",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0);
    // Add score display boxes
    table.lineStyle(2, 0x00ffff, 1);
    table.strokeRect(300, 5, 80, 35);
    table.strokeRect(420, 5, 80, 35);
    // Add score text
    this.player1ScoreText = this.add.text(340, 15, "0", {
      fontSize: "32px",
      fill: "#00ffff",
    });
    this.player2ScoreText = this.add.text(460, 15, "0", {
      fontSize: "32px",
      fill: "#ff3366",
    });
    const createTexture = (name, color, size, radius) => {
      const graphics = this.add.graphics();
      // Enhanced shadow effect for puck
      const shadowSize = size + 12;
      if (name === "puck") {
        // Larger, softer shadow for puck
        graphics.fillStyle(0x000000, 0.2);
        graphics.beginPath();
        graphics.arc(
          shadowSize / 2 + 4,
          shadowSize / 2 + 4,
          radius + 4,
          0,
          Math.PI * 2
        );
        graphics.closePath();
        graphics.fillPath();

        // Second shadow layer for depth
        graphics.fillStyle(0x000000, 0.3);
        graphics.beginPath();
        graphics.arc(
          shadowSize / 2 + 2,
          shadowSize / 2 + 2,
          radius + 2,
          0,
          Math.PI * 2
        );
        graphics.closePath();
        graphics.fillPath();
      } else {
        // Regular shadow for paddles
        graphics.fillStyle(0x000000, 0.3);
        graphics.beginPath();
        graphics.arc(
          shadowSize / 2,
          shadowSize / 2,
          radius + 2,
          0,
          Math.PI * 2
        );
        graphics.closePath();
        graphics.fillPath();
      }
      // Create gradient-like effect with multiple circles
      const baseColor = color;
      const highlightColor = 0xffffff;
      // Draw base circle with main color
      graphics.lineStyle(2, baseColor, 1);
      graphics.fillStyle(baseColor, 1);
      graphics.beginPath();
      graphics.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
      graphics.closePath();
      graphics.fillPath();
      graphics.strokePath();
      // Add highlight effect for metallic look
      graphics.fillStyle(highlightColor, 0.4);
      graphics.beginPath();
      graphics.arc(
        size / 2 - radius / 3,
        size / 2 - radius / 3,
        radius / 2,
        0,
        Math.PI * 2
      );
      graphics.closePath();
      graphics.fillPath();
      // Add secondary highlight for more depth
      graphics.fillStyle(highlightColor, 0.2);
      graphics.beginPath();
      graphics.arc(
        size / 2 - radius / 4,
        size / 2 - radius / 4,
        radius / 3,
        0,
        Math.PI * 2
      );
      graphics.closePath();
      graphics.fillPath();
      graphics.generateTexture(name, shadowSize, shadowSize);
      graphics.destroy();
    };
    // Create all game textures with larger sizes
    createTexture("paddle1", 0x00ffff, 64, 28); // Cyan for player 1, slightly larger radius
    createTexture("paddle2", 0xff3366, 64, 28); // Pink for player 2, slightly larger radius
    createTexture("puck", 0xffffff, 40, 16); // White puck with larger canvas for shadow

    // Create game objects
    this.paddle1 = this.physics.add.image(100, 300, "paddle1");
    this.paddle2 = this.physics.add.image(700, 300, "paddle2");
    this.puck = this.physics.add.image(400, 300, "puck");
    this.puck.setDepth(1); // Ensure puck renders above shadow

    // Set paddle constraints
    this.paddle1.setCollideWorldBounds(true);
    this.paddle2.setCollideWorldBounds(true);
    this.paddle1.setImmovable(true);
    this.paddle2.setImmovable(true);
    this.paddle1.body.setBounce(0);
    this.paddle2.body.setBounce(0);
    // Constrain paddles to their respective sides
    this.paddle1.setX(100).setCollideWorldBounds(true);
    this.paddle2.setX(700).setCollideWorldBounds(true);

    // Set movement boundaries for paddles
    this.paddle1.body.setBoundsRectangle(
      new Phaser.Geom.Rectangle(75, 75, 200, 450)
    );
    this.paddle2.body.setBoundsRectangle(
      new Phaser.Geom.Rectangle(525, 75, 200, 450)
    );

    // Set paddle properties with proper collision circles
    this.paddle1.body.setCircle(28, 4, 4);
    this.paddle2.body.setCircle(28, 4, 4);

    // Set additional physics properties for better collision response
    this.paddle1.body.pushable = false;
    this.paddle2.body.pushable = false;
    this.paddle1.body.setBounce(0);
    this.paddle2.body.setBounce(0);
    // Initialize game objects physics properties
    const initializeGameObject = (obj, config) => {
      obj
        .setBounce(config.bounce || 0)
        .setCollideWorldBounds(true)
        .setImmovable(config.immovable || false);

      if (config.circle) {
        obj.body.setCircle(
          config.radius,
          config.offsetX || 0,
          config.offsetY || 0
        );
      }

      if (config.bounds) {
        obj.body.setBoundsRectangle(
          new Phaser.Geom.Rectangle(...config.bounds)
        );
      }
    };

    // Initialize paddles
    [this.paddle1, this.paddle2].forEach((paddle, index) => {
      initializeGameObject(paddle, {
        immovable: true,
        circle: true,
        radius: 28,
        offsetX: 4,
        offsetY: 4,
        bounds: index === 0 ? [75, 75, 200, 450] : [525, 75, 200, 450],
      });

      // Set additional physics properties
      paddle.body.pushable = false;
      paddle.body.setBounce(0);
      paddle.body.setFriction(0, 0);
    });
    // Set up puck physics for air hockey-like movement
    this.puck.setBounce(1);
    this.puck.setDamping(false);
    this.puck.setDrag(0);
    this.puck.body.setAngularDrag(0);
    this.puck.body.useDamping = false;
    this.puck.body.setMass(1);
    this.puck.setFriction(0);
    this.puck.body.setAllowGravity(false);
    // Add "Methyle Group" text above the puck
    this.puckText = this.add.text(400, 300, "Methyle Group", {
      fontSize: "14px",
      fill: "#FFFFFF",
      align: "center",
      fontFamily: "Arial",
    });
    this.puckText.setOrigin(0.5, 1.5);
    this.puck.setFriction(0, 0);
    this.puck.setMaxVelocity(800);
    this.puck.body.setSize(28, 28); // Larger collision body for better physics

    // Create custom bounds for the puck
    this.physics.world.setBounds(50, 50, 700, 500, true);
    this.puck.setCollideWorldBounds(true);

    // Set proper bounce properties
    this.puck.body.bounce.setTo(1, 1);
    this.puck.body.restitution = 1;
    this.puck.setCircle(14, 6, 6);

    // Add bounds collision event
    this.puck.body.onWorldBounds = true;
    this.physics.world.on("worldbounds", (body, up, down, left, right) => {
      // Only reset on goals (left/right bounds within goal area)
      if ((left || right) && this.puck.y >= 175 && this.puck.y <= 425) {
        // Check if puck is within goal height bounds
        const inGoalHeight = this.puck.y >= 175 && this.puck.y <= 425;

        if (inGoalHeight) {
          // Update score and switch goal appearance
          if (left) {
            // Play sound when hitting the base
            if(this.audioContext){
              const source = this.audioContext.createBufferSource();
              source.buffer = this.paddleHitSound;
              source.connect(this.audioContext.destination);
              source.start();
            }

            this.player2Score++;
            this.player2ScoreText.setText(this.player2Score.toString());
            // Toggle the oncogene switch
            this.leftSwitchOn = !this.leftSwitchOn;

            // Show/hide CANCER text on left side
            this.tweens.add({
              targets: this.cancerTextLeft,
              alpha: this.leftSwitchOn ? 1 : 0,
              duration: 500,
              ease: "Power2",
            });

            // Flip left switch only if it's not already on
            this.tweens.add({
              targets: this.leftLever,
              x: this.leftSwitchOn ? -10 : 10,
              duration: 150,
              ease: "Back.Out",
              onStart: () => {
                const color = this.leftSwitchOn ? 0x00ff00 : 0xff0000;
                this.leftLever.clear();
                this.leftLever.lineStyle(3, color, 1);
                this.leftLever.fillStyle(color, 1);
                this.leftLever.beginPath();
                this.leftLever.arc(-5, -35, 7, 0, Math.PI * 2, false);
                this.leftLever.arc(-5, 35, 7, 0, Math.PI * 2, false);
                this.leftLever.fillPath();
                this.leftLever.strokePath();
                this.leftLever.fillRoundedRect(-12, -35, 14, 70, 7);
                this.leftLever.strokeRoundedRect(-12, -35, 14, 70, 7);
              },
              onComplete: () => {
                // No auto-reset anymore
              },
            });
          } else if (right) {
            // Play sound when hitting the base
            if(this.audioContext){
              const source = this.audioContext.createBufferSource();
              source.buffer = this.paddleHitSound;
              source.connect(this.audioContext.destination);
              source.start();
            }

            this.player1Score++;
            this.player1ScoreText.setText(this.player1Score.toString());
            // Toggle the tumor suppressor gene switch
            this.rightSwitchOn = !this.rightSwitchOn;
            // When tumor suppressor is ON, ensure CANCER is hidden
            if (this.rightSwitchOn) {
              this.tweens.add({
                targets: [this.cancerTextRight, this.cancerTextLeft],
                alpha: 0,
                duration: 500,
                ease: "Power2",
              });
            }

            // Flip right switch only if it's not already on
            this.tweens.add({
              targets: this.rightLever,
              x: this.rightSwitchOn ? 10 : -10,
              duration: 150,
              ease: "Back.Out",
              onStart: () => {
                const color = this.rightSwitchOn ? 0x00ff00 : 0xff0000;
                this.rightLever.clear();
                this.rightLever.lineStyle(3, color, 1);
                this.rightLever.fillStyle(color, 1);
                this.rightLever.beginPath();
                this.rightLever.arc(-5, -35, 7, 0, Math.PI * 2, false);
                this.rightLever.arc(-5, 35, 7, 0, Math.PI * 2, false);
                this.rightLever.fillPath();
                this.rightLever.strokePath();
                this.rightLever.fillRoundedRect(-12, -35, 14, 70, 7);
                this.rightLever.strokeRoundedRect(-12, -35, 14, 70, 7);
              },
              onComplete: () => {
                // No auto-reset anymore
              },
            });
          }

          // Create goal flash effect
          const flash = this.add.graphics();
          flash.fillStyle(0xffffff, 0.8);
          flash.fillRect(0, 0, 800, 600);

          // Fade out flash
          this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 200,
            onComplete: () => {
              flash.destroy();
            },
          });

          if (this.socket) {
            this.socket.emit("scoreUpdate", {
              player1: this.player1Score,
              player2: this.player2Score,
            });
          }


        }

        // Reset puck to center with no velocity
        this.puck.setPosition(400, 300);
        this.puck.setVelocity(0, 0);
      }

      
    });

    // Make puck interactive
    this.puck.setInteractive();

    // Add click handler for the puck
    this.puck.on("pointerdown", () => {
      if (this.puck.body.velocity.x === 0 && this.puck.body.velocity.y === 0) {
        const startAngle = Phaser.Math.Between(-45, 45);
        const startSpeed = 400;
        this.puck.setVelocity(
          startSpeed * Math.cos((startAngle * Math.PI) / 180),
          startSpeed * Math.sin((startAngle * Math.PI) / 180)
        );
      }
    });
    this.physics.add.collider(
      this.puck,
      [this.paddle1, this.paddle2],
      this.handlePaddleCollision,
      null,
      this
    );
    // Enable mouse input
    this.input.on("pointermove", (pointer) => {
      if (!this.isPlayerReady) return;

      let x, y;
      const lerpFactor = 0.5;

      // Player 1 (Left Side)
      if (this.playerNumber === 1) {
        const targetX = Phaser.Math.Clamp(pointer.x, 75, 325);
        const targetY = Phaser.Math.Clamp(pointer.y, 75, 525);
        x = Phaser.Math.Linear(this.paddle1.x, targetX, lerpFactor);
        y = Phaser.Math.Linear(this.paddle1.y, targetY, lerpFactor);
        this.paddle1.setPosition(x, y);
      }

      // Player 2 (Right Side)
      else if (this.playerNumber === 2) {
        const targetX = Phaser.Math.Clamp(pointer.x, 475, 725);
        const targetY = Phaser.Math.Clamp(pointer.y, 75, 525);
        x = Phaser.Math.Linear(this.paddle2.x, targetX, lerpFactor);
        y = Phaser.Math.Linear(this.paddle2.y, targetY, lerpFactor);
        this.paddle2.setPosition(x, y);
      }

      if (this.socket) {
        this.socket.emit("playerMove", { x, y });
      }
      
    });
    this.time.addEvent({
      delay: 3000,
      loop: false,
      callback: () => {},
    });
  }
  update() {
    this.paddle1.setVelocityY(0);
    this.paddle2.setVelocityY(0);
    this.puckText.setPosition(this.puck.x, this.puck.y - 20);

    // Handle CANCER text visibility based on switch states
    if (this.rightSwitchOn) {
      // When tumor suppressor is ON, hide right cancer text
      this.cancerTextRight.setAlpha(0);
    } else {
      // When tumor suppressor is OFF, show right cancer text
      this.cancerTextRight.setAlpha(1);
    }

    // Show left cancer text when oncogene is ON
    this.cancerTextLeft.setAlpha(this.leftSwitchOn ? 1 : 0);
    // Sync puck state
    if (this.socket && this.isPlayerReady) {
      this.socket.emit("puckUpdate", {
        x: this.puck.x,
        y: this.puck.y,
        velocityX: this.puck.body.velocity.x,
        velocityY: this.puck.body.velocity.y,
      });
    }
  }
  handlePaddleCollision(puck, paddle) {
    // Play sound effect
    if (puck.active && paddle.active) {
      
      if(this.audioContext){
        const source = this.audioContext.createBufferSource();
        source.buffer = this.paddleHitSound;
        source.connect(this.audioContext.destination);
        source.start();
      }
    }
    // Get vectors for collision calculation
    const dx = puck.x - paddle.x;
    const dy = puck.y - paddle.y;
    const collisionAngle = Math.atan2(dy, dx);
    // Get current velocities
    const puckVel = new Phaser.Math.Vector2(
      puck.body.velocity.x,
      puck.body.velocity.y
    );
    const paddleVel = new Phaser.Math.Vector2(
      paddle.body.velocity.x,
      paddle.body.velocity.y
    );
    // Calculate relative velocity
    const relativeVel = new Phaser.Math.Vector2(
      puckVel.x - paddleVel.x,
      puckVel.y - paddleVel.y
    );
    // Project velocity onto collision normal
    const normalX = Math.cos(collisionAngle);
    const normalY = Math.sin(collisionAngle);
    const normalVel = relativeVel.x * normalX + relativeVel.y * normalY;
    // Only bounce if moving toward each other
    if (normalVel < 0) {
      // Calculate reflection
      const restitution = 1; // Perfect elastic collision

      // Compute impulse scalar
      const j = -(1 + restitution) * normalVel;
      // Apply impulse
      const impulseX = j * normalX;
      const impulseY = j * normalY;
      // Calculate new velocity
      let newVelX = puckVel.x + impulseX;
      let newVelY = puckVel.y + impulseY;
      // Add paddle velocity influence
      const paddleInfluence = 0.5; // Reduced paddle influence
      newVelX += paddleVel.x * paddleInfluence;
      newVelY += paddleVel.y * paddleInfluence;
      // Maintain constant speed
      const currentSpeed = Math.sqrt(newVelX * newVelX + newVelY * newVelY);
      const targetSpeed = 800; // Constant speed after collision
      const speedRatio = targetSpeed / currentSpeed;

      newVelX *= speedRatio;
      newVelY *= speedRatio;
      // Position correction
      const minDistance = paddle.body.radius + puck.body.radius;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < minDistance) {
        const correction = minDistance - distance + 1;
        puck.x = paddle.x + normalX * correction;
        puck.y = paddle.y + normalY * correction;
      }
      // Set final velocity
      puck.setVelocity(newVelX, newVelY);
    }
  }
}

const container = document.getElementById("renderDiv");
const config = {
  type: Phaser.AUTO,
  parent: "renderDiv",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    antialias: true,
  },
  willReadFrequently: true,
  width: 800,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  render: {
    pixelArt: false,
    antialiasGL: true,
    canvas: document.createElement("canvas"),
  },
  scene: Example,
};

window.phaserGame = new Phaser.Game(config);
