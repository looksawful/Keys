import { useEffect, useRef } from "react";

export default function EqualizerCanvas({ height = 130 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext("2d");
    if (!context) return undefined;
    let frame = 0;
    let width = 0;
    let rafId = 0;

    const resize = () => {
      width = canvas.clientWidth;
      canvas.width = width;
      canvas.height = height;
    };

    const render = () => {
      frame += 0.016;
      context.clearRect(0, 0, width, height);
      const bars = Math.max(16, Math.floor(width / 12));
      const barWidth = width / bars - 3;

      for (let index = 0; index < bars; index += 1) {
        const x = index * (barWidth + 3);
        const wave = Math.abs(Math.sin(frame * 1.5 + index * 0.25));
        const barHeight = 12 + wave * height * 0.65;
        context.fillStyle =
          index % 7 === 0 ? "rgba(223,97,57,.65)" : "rgba(24,25,28,.32)";
        context.fillRect(x, height - barHeight, barWidth, barHeight);
      }
      rafId = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    rafId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
    };
  }, [height]);

  return <canvas className="eq-canvas" ref={canvasRef} style={{ height }} />;
}
