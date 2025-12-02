import React, { useState, useEffect, useRef } from 'react';

const PongClock = () => {
  const canvasRef = useRef(null);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  const game = useRef({
    ballX: 0,
    ballY: 0,
    ballVelX: 1.8,
    ballVelY: 1.2,
    leftPaddleY: 0,
    rightPaddleY: 0,
    paddleHeight: 80,
    paddleWidth: 12,
    ballRadius: 6,
    leftTarget: 0,
    rightTarget: 0,
    shouldLeftMiss: false,
    shouldRightMiss: false
  }).current;

  // Get India time
  const getIndiaTime = () => {
    const now = new Date();
    const indiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    return {
      hours: indiaTime.getHours(),
      minutes: indiaTime.getMinutes()
    };
  };

  // Initialize
  useEffect(() => {
    const { hours: h, minutes: m } = getIndiaTime();
    setHours(h);
    setMinutes(m);
    game.leftTarget = h;
    game.rightTarget = m;
    
    game.ballX = dimensions.width / 2;
    game.ballY = dimensions.height / 2;
    game.leftPaddleY = dimensions.height / 2 - game.paddleHeight / 2;
    game.rightPaddleY = dimensions.height / 2 - game.paddleHeight / 2;
  }, []);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
      game.ballX = window.innerWidth / 2;
      game.ballY = window.innerHeight / 2;
      game.leftPaddleY = window.innerHeight / 2 - game.paddleHeight / 2;
      game.rightPaddleY = window.innerHeight / 2 - game.paddleHeight / 2;
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      const { hours: h, minutes: m } = getIndiaTime();
      
      // Check if we need to update scores
      if (h !== game.leftTarget) {
        game.leftTarget = h;
        game.shouldRightMiss = true; // Right misses so left scores
      }
      if (m !== game.rightTarget) {
        game.rightTarget = m;
        game.shouldLeftMiss = true; // Left misses so right scores
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationId;

    const loop = () => {
      const w = canvas.width;
      const h = canvas.height;
      
      // Clear
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      
      // Center line
      ctx.fillStyle = '#fff';
      for (let i = 0; i < h; i += 25) {
        ctx.fillRect(w / 2 - 2, i, 4, 15);
      }
      
      // Move ball
      game.ballX += game.ballVelX;
      game.ballY += game.ballVelY;
      
      // Bounce top/bottom
      if (game.ballY - game.ballRadius < 0 || game.ballY + game.ballRadius > h) {
        game.ballVelY *= -1;
        game.ballY = game.ballY < h / 2 ? game.ballRadius : h - game.ballRadius;
      }
      
      // Left paddle AI
      if (game.shouldLeftMiss && game.ballVelX < 0) {
        // Miss - move away
        const center = game.leftPaddleY + game.paddleHeight / 2;
        if (center < game.ballY) {
          game.leftPaddleY -= 3;
        } else {
          game.leftPaddleY += 3;
        }
      } else if (game.ballVelX < 0 && game.ballX < w / 2) {
        // Normal - track ball
        const center = game.leftPaddleY + game.paddleHeight / 2;
        if (center < game.ballY - 10) {
          game.leftPaddleY += 2.5;
        } else if (center > game.ballY + 10) {
          game.leftPaddleY -= 2.5;
        }
      }
      
      // Right paddle AI
      if (game.shouldRightMiss && game.ballVelX > 0) {
        // Miss - move away
        const center = game.rightPaddleY + game.paddleHeight / 2;
        if (center < game.ballY) {
          game.rightPaddleY -= 3;
        } else {
          game.rightPaddleY += 3;
        }
      } else if (game.ballVelX > 0 && game.ballX > w / 2) {
        // Normal - track ball
        const center = game.rightPaddleY + game.paddleHeight / 2;
        if (center < game.ballY - 10) {
          game.rightPaddleY += 2.5;
        } else if (center > game.ballY + 10) {
          game.rightPaddleY -= 2.5;
        }
      }
      
      // Clamp paddles
      game.leftPaddleY = Math.max(0, Math.min(h - game.paddleHeight, game.leftPaddleY));
      game.rightPaddleY = Math.max(0, Math.min(h - game.paddleHeight, game.rightPaddleY));
      
      // Left paddle collision
      if (game.ballX - game.ballRadius < game.paddleWidth && game.ballVelX < 0) {
        if (game.ballY > game.leftPaddleY && game.ballY < game.leftPaddleY + game.paddleHeight) {
          game.ballVelX *= -1;
          const offset = game.ballY - (game.leftPaddleY + game.paddleHeight / 2);
          game.ballVelY = offset * 0.1;
        }
      }
      
      // Right paddle collision
      if (game.ballX + game.ballRadius > w - game.paddleWidth && game.ballVelX > 0) {
        if (game.ballY > game.rightPaddleY && game.ballY < game.rightPaddleY + game.paddleHeight) {
          game.ballVelX *= -1;
          const offset = game.ballY - (game.rightPaddleY + game.paddleHeight / 2);
          game.ballVelY = offset * 0.1;
        }
      }
      
      // Score left
      if (game.ballX + game.ballRadius < 0) {
        setMinutes(prev => {
          const newVal = prev + 1;
          return newVal >= 60 ? 0 : newVal;
        });
        game.shouldLeftMiss = false;
        resetBall();
      }
      
      // Score right
      if (game.ballX - game.ballRadius > w) {
        setHours(prev => {
          const newVal = prev + 1;
          if (newVal >= 24) {
            setMinutes(0);
            return 0;
          }
          return newVal;
        });
        game.shouldRightMiss = false;
        resetBall();
      }
      
      // Draw paddles
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, game.leftPaddleY, game.paddleWidth, game.paddleHeight);
      ctx.fillRect(w - game.paddleWidth, game.rightPaddleY, game.paddleWidth, game.paddleHeight);
      
      // Draw ball
      ctx.beginPath();
      ctx.arc(game.ballX, game.ballY, game.ballRadius, 0, Math.PI * 2);
      ctx.fill();
      
      animationId = requestAnimationFrame(loop);
    };
    
    const resetBall = () => {
      game.ballX = canvas.width / 2;
      game.ballY = canvas.height / 2;
      game.ballVelX = (Math.random() > 0.5 ? 1 : -1) * 1.8;
      game.ballVelY = (Math.random() - 0.5) * 2;
    };
    
    loop();
    return () => cancelAnimationFrame(animationId);
  }, [dimensions]);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        .retro {
          font-family: 'Press Start 2P', monospace;
        }
      `}</style>
      
      <div className="absolute top-6 left-0 right-0 z-10 flex items-center justify-center">
        <span className="retro text-white" style={{ fontSize: 'clamp(2.5rem, 10vw, 7rem)' }}>
          {String(hours).padStart(2, '0')}
        </span>
        <span className="retro text-white mx-6" style={{ fontSize: 'clamp(2.5rem, 10vw, 7rem)' }}>
          :
        </span>
        <span className="retro text-white" style={{ fontSize: 'clamp(2.5rem, 10vw, 7rem)' }}>
          {String(minutes).padStart(2, '0')}
        </span>
      </div>
      
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />
      
      <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-gray-500">
        bigjobby.com - To exit full screen, press Esc
      </div>
    </div>
  );
};

export default PongClock;