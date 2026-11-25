import { useEffect, useRef } from 'react';
import { createSilkRenderer } from './silkRenderer';

export default function SilkWaves({ preference }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const targetFrameInterval = 1000 / 60;
    let renderer;
    let frame;
    let lastFrame;
    let seconds = 0;

    function resize() {
      if (!renderer) return;
      const { clientWidth, clientHeight } = canvas;
      if (!clientWidth || !clientHeight) return;
      const scale = Math.min(window.devicePixelRatio || 1, 3, Math.sqrt(2200000 / (clientWidth * clientHeight)));
      renderer.resize(Math.round(clientWidth * scale), Math.round(clientHeight * scale));
      renderer.draw(seconds);
      canvas.dataset.ready = 'true';
    }

    function animate(now) {
      if (lastFrame === undefined || now - lastFrame >= targetFrameInterval - 1) {
        if (lastFrame !== undefined) seconds += Math.min(now - lastFrame, 100) / 1000;
        lastFrame = now;
        renderer.draw(seconds);
      }
      frame = requestAnimationFrame(animate);
    }

    function syncPlayback() {
      cancelAnimationFrame(frame);
      lastFrame = undefined;
      const enabled = preference === 'on' || (preference === 'system' && !motion.matches);
      if (renderer && enabled && !document.hidden) {
        frame = requestAnimationFrame(animate);
      }
    }

    function restore() {
      renderer = createSilkRenderer(canvas);
      resize();
      syncPlayback();
    }

    function loseContext(event) {
      event.preventDefault();
      renderer = null;
      delete canvas.dataset.ready;
      syncPlayback();
    }

    restore();
    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(canvas);
    canvas.addEventListener('webglcontextlost', loseContext);
    canvas.addEventListener('webglcontextrestored', restore);
    motion.addEventListener('change', syncPlayback);
    document.addEventListener('visibilitychange', syncPlayback);

    return () => {
      cancelAnimationFrame(frame);
      sizeObserver.disconnect();
      motion.removeEventListener('change', syncPlayback);
      document.removeEventListener('visibilitychange', syncPlayback);
      canvas.removeEventListener('webglcontextlost', loseContext);
      canvas.removeEventListener('webglcontextrestored', restore);
      renderer?.dispose();
      delete canvas.dataset.ready;
    };
  }, [preference]);

  return (
    <div className="silk-waves" data-motion={preference} aria-hidden="true">
      <canvas ref={canvasRef} className="silk-canvas" />
      <div className="silk-still" />
    </div>
  );
}
