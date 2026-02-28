import { useEffect, useRef } from "react";

export default function Aurora({ opacity = 0.16 }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext("2d");
    if (!context) return undefined;

    let width = 0;
    let height = 0;

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const draw = () => {
      const time = (Date.now() - startRef.current) * 0.00025;
      context.clearRect(0, 0, width, height);

      for (let index = 0; index < 5; index += 1) {
        const gradient = context.createLinearGradient(0, 0, width, height * 0.7);
        const h1 = (210 + index * 22 + time * 14) % 360;
        const h2 = (250 + index * 18 + time * 20) % 360;
        gradient.addColorStop(0, `hsla(${h1},50%,75%,${0.08 - index * 0.012})`);
        gradient.addColorStop(0.5, `hsla(${h2},40%,80%,${0.05 - index * 0.007})`);
        gradient.addColorStop(1, `hsla(${(h1 + 60) % 360},30%,85%,0.03)`);
        context.fillStyle = gradient;

        context.beginPath();
        const yBase = height * (0.12 + index * 0.13);
        context.moveTo(-10, height + 10);
        for (let x = -10; x <= width + 10; x += 6) {
          const nx = x / Math.max(width, 1);
          const w1 = Math.sin(nx * 5 + time * 0.6 + index) * Math.cos(nx * 3 - time * 0.3);
          const w2 =
            Math.sin(nx * 7 - time * 0.4 + index * 0.5) * Math.cos(nx * 2 + time * 0.5);
          context.lineTo(x, yBase + (w1 * 0.2 + w2 * 0.12) * height * 0.3);
        }
        context.lineTo(width + 10, height + 10);
        context.closePath();
        context.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return <canvas className="aurora" ref={canvasRef} style={{ opacity }} />;
}

