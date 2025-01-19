import { useEffect, useRef, useState, useCallback } from "react";
import "./App.css";
import { scenes } from "./data/scenes";

interface Scene {
  index: number;
  media: string;
  duration: number;
  sentence: string;
  textPosition: string;
  textAnimation: string;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentScene, setCurrentScene] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const calculateTextPosition = (
    canvas: HTMLCanvasElement,
    scene: Scene,
    ctx: CanvasRenderingContext2D
  ) => {
    let textX = canvas.width / 2;
    let textY = canvas.height / 2;

    switch (scene.textPosition) {
      case "top-left":
        textX = canvas.width * 0.1;
        textY = canvas.height * 0.1;
        ctx.textAlign = "left";
        break;
      case "top-right":
        textX = canvas.width * 0.9;
        textY = canvas.height * 0.1;
        ctx.textAlign = "right";
        break;
      case "bottom-left":
        textX = canvas.width * 0.1;
        textY = canvas.height * 0.9;
        ctx.textAlign = "left";
        break;
      case "bottom-right":
        textX = canvas.width * 0.9;
        textY = canvas.height * 0.9;
        ctx.textAlign = "right";
        break;
      case "middle-center":
      default:
        textX = canvas.width / 2;
        textY = canvas.height / 2;
        ctx.textAlign = "center";
    }
    return { textX, textY };
  };

  const renderText = (
    ctx: CanvasRenderingContext2D,
    scene: Scene,
    elapsed: number,
    textX: number,
    textY: number
  ) => {
    switch (scene.textAnimation) {
      case "typing": {
        const charsToShow = Math.floor(elapsed * 20);
        const displayText = scene.sentence.slice(0, charsToShow);
        ctx.fillText(displayText, textX, textY);
        break;
      }
      case "blink": {
        if (Math.floor(elapsed * 2) % 2 === 0) {
          ctx.fillText(scene.sentence, textX, textY);
        }
        break;
      }
      default:
        ctx.fillText(scene.sentence, textX, textY);
    }
  };

  const handleSceneAdvance = useCallback(
    (elapsed: number, timestamp: number, scene: Scene) => {
      if (isPlaying && elapsed >= scene.duration) {
        if (currentScene < scenes.length - 1) {
          setCurrentScene((prev) => prev + 1);
          setStartTime(timestamp);
        } else {
          setCurrentScene(scenes.length);
          setIsPlaying(false);
        }
      }
    },
    [isPlaying, currentScene]
  );

  useEffect(() => {
    if (currentScene >= scenes.length) {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.remove();
        videoRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 1280;
    canvas.height = 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.font = "32px Arial";
    ctx.fillStyle = "black";

    const scene = scenes[currentScene];
    const isVideo = scene.media.endsWith(".mp4");

    const handleCanvasClick = async () => {
      if (videoRef.current) {
        if (videoRef.current.paused) {
          await videoRef.current.play();
          setIsPlaying(true);
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      }
    };

    canvas.removeEventListener("click", handleCanvasClick);
    canvas.addEventListener("click", handleCanvasClick);

    if (isVideo) {
      if (!videoRef.current) {
        const video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.src = scene.media;
        video.muted = true;
        video.playsInline = true;
        video.loop = false;
        video.currentTime = 3;

        if (isPlaying) {
          video.play();
        }

        videoRef.current = video;
      }

      if (videoRef.current) {
        if (isPlaying && videoRef.current.paused) {
          videoRef.current.play();
        } else if (!isPlaying && !videoRef.current.paused) {
          videoRef.current.pause();
        }
      }

      const video = videoRef.current;

      let animationFrame: number;

      const animate = (timestamp: number) => {
        if (!startTime) setStartTime(timestamp);
        const elapsed = (timestamp - startTime) / 1000;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (video.readyState >= 2) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        const { textX, textY } = calculateTextPosition(canvas, scene, ctx);
        renderText(ctx, scene, elapsed, textX, textY);
        handleSceneAdvance(elapsed, timestamp, scene);

        animationFrame = requestAnimationFrame(animate);
      };

      animationFrame = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(animationFrame);
        canvas.removeEventListener("click", handleCanvasClick);
        if (videoRef.current) {
          videoRef.current.pause();
        }
      };
    } else {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = scene.media;

      let animationFrame: number;

      const animate = (timestamp: number) => {
        if (!startTime) setStartTime(timestamp);

        const elapsed = (timestamp - startTime) / 1000;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (img.complete && img.naturalWidth !== 0) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }

        const { textX, textY } = calculateTextPosition(canvas, scene, ctx);
        renderText(ctx, scene, elapsed, textX, textY);
        handleSceneAdvance(elapsed, timestamp, scene);

        animationFrame = requestAnimationFrame(animate);
      };

      animationFrame = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(animationFrame);
        canvas.removeEventListener("click", handleCanvasClick);
      };
    }
  }, [currentScene, isPlaying, handleSceneAdvance, startTime]);

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.remove();
        videoRef.current = null;
      }
    };
  }, []);

  return (
    <div className="video-container">
      {currentScene < scenes.length ? (
        <canvas ref={canvasRef} style={{ cursor: "pointer" }} />
      ) : (
        <div
          style={{
            width: "1280px",
            height: "720px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid #333",
            fontSize: "32px",
            background: "#242424",
            color: "white",
          }}
        >
          Scene ended
        </div>
      )}
    </div>
  );
}

export default App;
