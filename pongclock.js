import React, { useState, useEffect, useRef } from 'react';

const PongClock = () => {
  const canvasRef = useRef(null);
  const [time, setTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [hourScore, setHourScore] = useState(0);
  const [minuteScore, setMinuteScore] = useState(0);
  const gameStateRef = useRef({
    ballX: 400,
    ballY: 300,
    ballSpeedX: 1.2,
    ballSpeedY: 1.2,
    leftPaddleY: 250,
    rightPaddleY: 250,
    paddleHeight: 120,
    paddleWidth: 20,
    ballSize: 12,
    ballSpeed: 1.7,
    lastMinute: -1,
    scored: false
  });

  // Get India time
  const getIndiaTime = () => {
    const now = new Date();
    const indiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    return {
      hours: indiaTime.getHours(),
      minutes: indiaTime.getMinutes(),
      seconds: indiaTime.getSeconds()
    };
  };

  // Initialize time
  useEffect(() => {
    const currentTime = getIndiaTime();
    setTime(currentTime);
    setHourScore(currentTime.hours);
    setMinuteScore(currentTime.minutes);
    gameStateRef.current.lastMinute = currentTime.minutes;
  }, []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      const currentTime = getIndiaTime();
      setTime(currentTime);

      // Check for minute change
      if (currentTime.minutes !== gameStateRef.current.lastMinute) {
        gameStateRef.current.lastMinute = currentTime.minutes;
        gameStateRef.current.scored = false;
        
        // At midnight, reset everything
        if (currentTime.hours === 0 && currentTime.minutes === 0) {
          setHourScore(0);
          setMinuteScore(0);
        }
        // At the top of each hour, reset minute score
        else if (currentTime.minutes === 0) {
          setMinuteScore(0);
          setHourScore(currentTime.hours);
        } else {
          setMinuteScore(currentTime.minutes);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const game = gameStateRef.current;

    const animate = () => {
      // Clear canvas
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw center line
      ctx.fillStyle = '#fff';
      for (let i = 0; i < canvas.height; i += 30) {
        ctx.fillRect(canvas.width / 2 - 2, i, 4, 20);
      }

      // Move ball with constant speed
      const speed = game.ballSpeed;
      const angle = Math.atan2(game.ballSpeedY, game.ballSpeedX);
      game.ballX += Math.cos(angle) * speed;
      game.ballY += Math.sin(angle) * speed;

      // Ball collision with top and bottom
      if (game.ballY <= game.ballSize || game.ballY >= canvas.height - game.ballSize) {
        game.ballSpeedY = -game.ballSpeedY;
      }

      // AI for left paddle (hours)
      const leftPaddleCenter = game.leftPaddleY + game.paddleHeight / 2;
      if (leftPaddleCenter < game.ballY - 25) {
        game.leftPaddleY += 1.3;
      } else if (leftPaddleCenter > game.ballY + 25) {
        game.leftPaddleY -= 1.3;
      }

      // AI for right paddle (minutes)
      const rightPaddleCenter = game.rightPaddleY + game.paddleHeight / 2;
      if (rightPaddleCenter < game.ballY - 25) {
        game.rightPaddleY += 1.3;
      } else if (rightPaddleCenter > game.ballY + 25) {
        game.rightPaddleY -= 1.3;
      }

      // Keep paddles in bounds
      game.leftPaddleY = Math.max(0, Math.min(canvas.height - game.paddleHeight, game.leftPaddleY));
      game.rightPaddleY = Math.max(0, Math.min(canvas.height - game.paddleHeight, game.rightPaddleY));

      // Ball collision with left paddle
      if (game.ballX - game.ballSize <= game.paddleWidth) {
        if (game.ballY >= game.leftPaddleY && game.ballY <= game.leftPaddleY + game.paddleHeight) {
          game.ballSpeedX = -game.ballSpeedX;
          const hitPos = (game.ballY - game.leftPaddleY) / game.paddleHeight;
          game.ballSpeedY = (hitPos - 0.5) * 2.4;
        }
      }

      // Ball collision with right paddle
      if (game.ballX + game.ballSize >= canvas.width - game.paddleWidth) {
        if (game.ballY >= game.rightPaddleY && game.ballY <= game.rightPaddleY + game.paddleHeight) {
          game.ballSpeedX = -game.ballSpeedX;
          const hitPos = (game.ballY - game.rightPaddleY) / game.paddleHeight;
          game.ballSpeedY = (hitPos - 0.5) * 2.4;
        }
      }

      // Score when ball goes out (smooth transition on minute change)
      if (!game.scored && time.seconds >= 58) {
        if (game.ballX <= 0) {
          game.scored = true;
          // Minute side (right) loses, hour gains
        } else if (game.ballX >= canvas.width) {
          game.scored = true;
          // Hour side (left) loses, minute gains
        }
      }

      // Reset ball if it goes out
      if (game.ballX <= 0 || game.ballX >= canvas.width) {
        game.ballX = canvas.width / 2;
        game.ballY = canvas.height / 2;
        const randomAngle = (Math.random() - 0.5) * Math.PI / 3;
        game.ballSpeedX = Math.cos(randomAngle) * (Math.random() > 0.5 ? 1 : -1);
        game.ballSpeedY = Math.sin(randomAngle);
      }

      // Draw paddles
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, game.leftPaddleY, game.paddleWidth, game.paddleHeight);
      ctx.fillRect(canvas.width - game.paddleWidth, game.rightPaddleY, game.paddleWidth, game.paddleHeight);

      // Draw ball
      ctx.beginPath();
      ctx.arc(game.ballX, game.ballY, game.ballSize, 0, Math.PI * 2);
      ctx.fill();

      requestAnimationFrame(animate);
    };

    animate();
  }, [time.seconds]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white font-mono">
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        .retro-font {
          font-family: 'Press Start 2P', monospace;
        }
      `}</style>
      
      <div className="text-center mb-8">
        <div className="text-8xl font-bold tracking-wider mb-4 retro-font">
          <span>{String(hourScore).padStart(2, '0')}</span>
          <span className="mx-4">:</span>
          <span>{String(minuteScore).padStart(2, '0')}</span>
        </div>
        <div className="text-2xl text-gray-400">
          {String(time.hours).padStart(2, '0')}:
          {String(time.minutes).padStart(2, '0')}:
          {String(time.seconds).padStart(2, '0')}
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="border-4 border-white"
      />
      
      <div className="mt-4 text-sm text-gray-500">
        bigjobby.com - To exit full screen, press Esc
      </div>
    </div>
  );
};

export default PongClock;