import React, { useState, useEffect, useRef, useCallback } from 'react';

// Get India time (system time in IST)
const getIndiaTime = () => {
  const now = new Date();
  const indiaTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  );
  return {
    hours: indiaTime.getHours(),
    minutes: indiaTime.getMinutes(),
  };
};

const PongClock = () => {
  const canvasRef = useRef(null);

  // Ball speed (pixels per second for delta-time physics)
  const BALL_SPEED = 800;

  // Displayed time comes from scores: left = hours, right = minutes
  // Initialize with correct time to avoid initial effect update
  const [time, setTime] = useState(() => getIndiaTime());
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const gameRef = useRef({
    ballX: 0,
    ballY: 0,
    ballVelX: 0,
    ballVelY: 0,
    leftPaddleY: 0,
    rightPaddleY: 0,
    paddleHeight: 80,
    paddleWidth: 20,
    ballRadius: 10,
    // Targets track system time; scores reflect displayed time
    leftTarget: time.hours,   // current system hour
    rightTarget: time.minutes,  // current system minute
    // Pending-miss flags: when true, paddle must freeze/move away until ball scores
    pendingMissLeft: false,
    pendingMissRight: false,
    lastBallDirX: 1, // track last ball direction for reset
    lastTimestamp: 0,
    speedMultiplier: 1, // Add speed multiplier
    leftPaddleOffset: 0, // AI targeting offset
    rightPaddleOffset: 0, // AI targeting offset
  });

  // Compute responsive sizes
  const computeSizes = useCallback((w, h) => {
    const game = gameRef.current;
    game.paddleHeight = Math.max(80, Math.floor(h * 0.18));
    game.paddleWidth = Math.max(12, Math.floor(w * 0.015));
    game.ballRadius = Math.max(8, Math.floor(Math.min(w, h) * 0.015));
  }, []); // gameRef is stable

  // Reset ball to center with reversed horizontal velocity
  const resetBall = useCallback((w, h) => {
    const game = gameRef.current;
    game.ballX = w / 2;
    game.ballY = h / 2;
    // Reverse direction from last ball exit
    const dir = -game.lastBallDirX;
    game.lastBallDirX = dir;
    game.speedMultiplier = 1; // Reset speed

    // Reset AI offsets
    game.leftPaddleOffset = (Math.random() - 0.5) * game.paddleHeight * 0.7;
    game.rightPaddleOffset = (Math.random() - 0.5) * game.paddleHeight * 0.7;

    const angle = ((Math.random() - 0.5) * Math.PI) / 4; // ±22.5° for variety
    game.ballVelX = dir * Math.cos(angle) * BALL_SPEED;
    game.ballVelY = Math.sin(angle) * BALL_SPEED;
  }, [BALL_SPEED]); // gameRef is stable

  // Initialize on mount
  useEffect(() => {
    const game = gameRef.current;
    // No need to set time state here as it's initialized in useState

    // Update game targets just in case
    const t = getIndiaTime();
    game.leftTarget = t.hours;
    game.rightTarget = t.minutes;

    computeSizes(dimensions.width, dimensions.height);

    game.leftPaddleY = dimensions.height / 2 - game.paddleHeight / 2;
    game.rightPaddleY = dimensions.height / 2 - game.paddleHeight / 2;

    resetBall(dimensions.width, dimensions.height);
  }, [computeSizes, dimensions, resetBall]); // gameRef is stable

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setDimensions({ width: w, height: h });

      computeSizes(w, h);

      const game = gameRef.current;
      game.ballX = w / 2;
      game.ballY = h / 2;
      game.leftPaddleY = h / 2 - game.paddleHeight / 2;
      game.rightPaddleY = h / 2 - game.paddleHeight / 2;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [computeSizes]);

  // Poll system time every second to detect increments and set miss flags
  useEffect(() => {
    const timer = setInterval(() => {
      const { hours: sysH, minutes: sysM } = getIndiaTime();
      const game = gameRef.current;

      // If hour changed and we haven't already scheduled a pending miss
      if (sysH !== game.leftTarget && !game.pendingMissRight) {
        game.pendingMissRight = true;
        game.leftTarget = sysH;
      }
      // If minute changed and we haven't already scheduled a pending miss
      if (sysM !== game.rightTarget && !game.pendingMissLeft) {
        game.pendingMissLeft = true;
        game.rightTarget = sysM;
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Main game loop with delta timing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;

    const game = gameRef.current;

    // Reset timestamp when loop restarts
    game.lastTimestamp = 0;

    const loop = (timestamp) => {
      // Delta time in seconds
      if (!game.lastTimestamp) game.lastTimestamp = timestamp;
      const dt = Math.min((timestamp - game.lastTimestamp) / 1000, 0.05); // cap to avoid spiral
      game.lastTimestamp = timestamp;

      const w = canvas.width;
      const h = canvas.height;

      // Paddle speed (pixels per second) - scales with game speed
      const currentSpeedScale = game.speedMultiplier;
      const paddleSpeed = BALL_SPEED * 1.2 * currentSpeedScale;

      // Clear
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);

      // Font size for time and center line squares
      const timeFontSize = Math.max(24, Math.min(140, Math.floor(w * 0.08)));

      // Center dashed line
      ctx.fillStyle = '#fff';
      const squareSize = Math.max(6, Math.floor(timeFontSize * 0.4));
      const spacing = squareSize * 2;
      const cx = Math.floor(w / 2 - squareSize / 2);
      for (let y = 0; y < h; y += spacing) {
        ctx.fillRect(cx, y, squareSize, squareSize);
      }

      // Draw time (from scores, not live system time)
      const hh = String(time.hours).padStart(2, '0');
      const mm = String(time.minutes).padStart(2, '0');
      const timeStr = `${hh} ${mm}`;

      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = `bold ${timeFontSize}px 'Press Start 2P', monospace`;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 6;
      ctx.fillText(timeStr, w / 2, 12);
      ctx.restore();

      // Move ball (delta time)
      game.ballX += game.ballVelX * dt;
      game.ballY += game.ballVelY * dt;

      // Bounce top/bottom
      if (game.ballY - game.ballRadius < 0) {
        game.ballY = game.ballRadius;
        game.ballVelY = Math.abs(game.ballVelY);
      }
      if (game.ballY + game.ballRadius > h) {
        game.ballY = h - game.ballRadius;
        game.ballVelY = -Math.abs(game.ballVelY);
      }

      // Left paddle AI
      // When pendingMissLeft is active: freeze paddle (stop tracking entirely)
      // so the ball will pass and score
      const leftCenter = game.leftPaddleY + game.paddleHeight / 2;
      if (game.pendingMissLeft) {
        // Paddle tries to 'just miss' by targeting a spot slightly off
        if (game.ballVelX < 0) {
          const missOffset = game.paddleHeight / 2 + game.ballRadius + 15;
          let targetCenter;

          if (leftCenter < game.ballY) {
            // Paddle is above, stay just above
            targetCenter = game.ballY - missOffset;
          } else {
            // Paddle is below, stay just below
            targetCenter = game.ballY + missOffset;
          }

          const targetY = targetCenter - game.paddleHeight / 2;
          const diff = targetY - game.leftPaddleY;
          const maxMove = paddleSpeed * dt;

          if (Math.abs(diff) < maxMove) {
            game.leftPaddleY = targetY;
          } else {
            game.leftPaddleY += Math.sign(diff) * maxMove;
          }
        }
      } else {
        // Normal tracking only when ball coming towards us
        if (game.ballVelX < 0) {
          // Target the ball plus our random offset to create angles
          const targetY = (game.ballY + game.leftPaddleOffset) - game.paddleHeight / 2;
          const diff = targetY - game.leftPaddleY;
          const maxMove = paddleSpeed * dt;

          if (Math.abs(diff) < maxMove) {
            game.leftPaddleY = targetY;
          } else {
            game.leftPaddleY += Math.sign(diff) * maxMove;
          }
        }
      }

      // Right paddle AI
      // When pendingMissRight is active: freeze paddle (stop tracking entirely)
      const rightCenter = game.rightPaddleY + game.paddleHeight / 2;
      if (game.pendingMissRight) {
        // Paddle tries to 'just miss' by targeting a spot slightly off
        if (game.ballVelX > 0) {
          const missOffset = game.paddleHeight / 2 + game.ballRadius + 15;
          let targetCenter;

          if (rightCenter < game.ballY) {
            // Paddle is above, stay just above
            targetCenter = game.ballY - missOffset;
          } else {
            // Paddle is below, stay just below
            targetCenter = game.ballY + missOffset;
          }

          const targetY = targetCenter - game.paddleHeight / 2;
          const diff = targetY - game.rightPaddleY;
          const maxMove = paddleSpeed * dt;

          if (Math.abs(diff) < maxMove) {
            game.rightPaddleY = targetY;
          } else {
            game.rightPaddleY += Math.sign(diff) * maxMove;
          }
        }
      } else {
        // Normal tracking only when ball coming towards us
        if (game.ballVelX > 0) {
          // Target the ball plus our random offset to create angles
          const targetY = (game.ballY + game.rightPaddleOffset) - game.paddleHeight / 2;
          const diff = targetY - game.rightPaddleY;
          const maxMove = paddleSpeed * dt;

          if (Math.abs(diff) < maxMove) {
            game.rightPaddleY = targetY;
          } else {
            game.rightPaddleY += Math.sign(diff) * maxMove;
          }
        }
      }

      // Clamp paddles
      game.leftPaddleY = Math.max(0, Math.min(h - game.paddleHeight, game.leftPaddleY));
      game.rightPaddleY = Math.max(0, Math.min(h - game.paddleHeight, game.rightPaddleY));

      // Left paddle collision
      if (
        game.ballX - game.ballRadius < game.paddleWidth &&
        game.ballVelX < 0
      ) {
        if (
          game.ballY > game.leftPaddleY &&
          game.ballY < game.leftPaddleY + game.paddleHeight
        ) {
          game.speedMultiplier = Math.min(game.speedMultiplier * 1.08, 1.8); // Increase speed, cap at 1.8x
          // Update AI offset for the OTHER paddle so it hits differently next time
          game.rightPaddleOffset = (Math.random() - 0.5) * game.paddleHeight * 0.7;

          const currentSpeed = BALL_SPEED * game.speedMultiplier;

          const offset = game.ballY - (game.leftPaddleY + game.paddleHeight / 2);
          const normalized = offset / (game.paddleHeight / 2);
          const maxAngle = Math.PI / 4;
          const angle = normalized * maxAngle;
          game.ballVelX = Math.cos(angle) * currentSpeed;
          game.ballVelY = Math.sin(angle) * currentSpeed;
          game.ballX = game.paddleWidth + game.ballRadius;
        }
      }

      // Right paddle collision
      if (
        game.ballX + game.ballRadius > w - game.paddleWidth &&
        game.ballVelX > 0
      ) {
        if (
          game.ballY > game.rightPaddleY &&
          game.ballY < game.rightPaddleY + game.paddleHeight
        ) {
          game.speedMultiplier = Math.min(game.speedMultiplier * 1.08, 1.8); // Increase speed, cap at 1.8x
          // Update AI offset for the OTHER paddle so it hits differently next time
          game.leftPaddleOffset = (Math.random() - 0.5) * game.paddleHeight * 0.7;

          const currentSpeed = BALL_SPEED * game.speedMultiplier;

          const offset = game.ballY - (game.rightPaddleY + game.paddleHeight / 2);
          const normalized = offset / (game.paddleHeight / 2);
          const maxAngle = Math.PI / 4;
          const angle = normalized * maxAngle;
          game.ballVelX = -Math.cos(angle) * currentSpeed;
          game.ballVelY = Math.sin(angle) * currentSpeed;
          game.ballX = w - game.paddleWidth - game.ballRadius;
        }
      }

      // Ball exits left -> right side scores (minutes update)
      if (game.ballX + game.ballRadius < 0) {
        game.lastBallDirX = -1; // ball was going left
        // Update displayed minutes to system minute
        const { minutes: sysM } = getIndiaTime();
        setTime(prev => ({ ...prev, minutes: sysM }));
        game.rightTarget = sysM;
        game.pendingMissLeft = false; // pending miss consumed
        resetBall(w, h);
      }

      // Ball exits right -> left side scores (hours update)
      if (game.ballX - game.ballRadius > w) {
        game.lastBallDirX = 1; // ball was going right
        // Update displayed hours to system hour
        const { hours: sysH } = getIndiaTime();
        setTime(prev => ({ ...prev, hours: sysH }));
        game.leftTarget = sysH;
        game.pendingMissRight = false; // pending miss consumed
        resetBall(w, h);
      }

      // Draw paddles
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, game.leftPaddleY, game.paddleWidth, game.paddleHeight);
      ctx.fillRect(
        w - game.paddleWidth,
        game.rightPaddleY,
        game.paddleWidth,
        game.paddleHeight
      );

      // Draw ball
      ctx.beginPath();
      ctx.arc(game.ballX, game.ballY, game.ballRadius, 0, Math.PI * 2);
      ctx.fill();

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [dimensions, time, resetBall, BALL_SPEED]); // Added missing dependencies

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        .retro {
          font-family: 'Press Start 2P', monospace;
        }
      `}</style>

      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />
    </div>
  );
};

export default PongClock;