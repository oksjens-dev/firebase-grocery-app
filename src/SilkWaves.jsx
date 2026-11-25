import { useEffect, useRef } from 'react';
import { createSilkRenderer } from './silkRenderer';

export default function SilkWaves() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const targetFrameInterval = 1000 / 60;
    let renderer;
    let frame;
    let lastFrame;
    let seconds = 0;
    let inView = true;

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
        if (lastFrame !== undefined) seconds += Math.min(now - lastFrame, 42) / 1000;
        lastFrame = now;
        renderer.draw(seconds);
      }
      frame = requestAnimationFrame(animate);
    }

    function syncPlayback() {
      cancelAnimationFrame(frame);
      lastFrame = undefined;
      if (renderer && inView && !document.hidden && !motion.matches) {
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
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncPlayback();
    });
    visibilityObserver.observe(canvas);
    canvas.addEventListener('webglcontextlost', loseContext);
    canvas.addEventListener('webglcontextrestored', restore);
    motion.addEventListener('change', syncPlayback);
    document.addEventListener('visibilitychange', syncPlayback);

    return () => {
      cancelAnimationFrame(frame);
      sizeObserver.disconnect();
      visibilityObserver.disconnect();
      motion.removeEventListener('change', syncPlayback);
      document.removeEventListener('visibilitychange', syncPlayback);
      canvas.removeEventListener('webglcontextlost', loseContext);
      canvas.removeEventListener('webglcontextrestored', restore);
      renderer?.dispose();
      delete canvas.dataset.ready;
    };
  }, []);

  return (
    <div className="silk-waves" aria-hidden="true">
      <canvas ref={canvasRef} className="silk-canvas" />
      <svg viewBox="0 0 540 650" preserveAspectRatio="xMidYMid slice" focusable="false">
        <defs>
          <linearGradient id="silk-base" x1="0" y1="0" x2="1" y2=".82" gradientUnits="objectBoundingBox">
            <stop stopColor="#f6e7ff" />
            <stop offset=".49" stopColor="#c4a0f4" />
            <stop offset="1" stopColor="#8045c9" />
          </linearGradient>
          <linearGradient id="silk-fold" x1=".60" y1=".08" x2=".90" y2=".91">
            <stop stopColor="#debcff" />
            <stop offset=".29" stopColor="#a06cdb" />
            <stop offset=".53" stopColor="#57309c" />
            <stop offset=".69" stopColor="#8448cc" />
            <stop offset=".88" stopColor="#b98bee" />
            <stop offset="1" stopColor="#eacfff" />
          </linearGradient>
          <linearGradient id="silk-sweep" x1=".20" y1=".04" x2=".50" y2=".91">
            <stop stopColor="#ffecff" />
            <stop offset=".18" stopColor="#e9c9fa" />
            <stop offset=".43" stopColor="#ab77e2" />
            <stop offset=".73" stopColor="#7840c0" />
            <stop offset="1" stopColor="#b88feb" />
          </linearGradient>
          <linearGradient id="silk-edge">
            <stop stopColor="#f7dfff" stopOpacity="0" />
            <stop offset=".47" stopColor="#fff3ff" stopOpacity=".88" />
            <stop offset="1" stopColor="#fff" stopOpacity=".08" />
          </linearGradient>
          <linearGradient id="silk-sheen" x1=".9" y1="0" x2=".12" y2=".75">
            <stop stopColor="#fff4ff" stopOpacity=".04" />
            <stop offset=".44" stopColor="#fff4ff" stopOpacity=".7" />
            <stop offset="1" stopColor="#f2cbff" stopOpacity=".04" />
          </linearGradient>
          <filter id="silk-diffusion" x="-.1" y="-.35" width="1.2" height="1.7">
            <feGaussianBlur stdDeviation="11" />
          </filter>
          <radialGradient id="silk-glow">
            <stop stopColor="#fae4ff" stopOpacity=".86" />
            <stop offset="1" stopColor="#e6c0ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path fill="url(#silk-base)" d="M0 0h540v650H0z" />
        <g className="silk-fold">
          <path fill="url(#silk-fold)" d="M-125 326C-20 200 64 215 167 156 284 88 311-43 429-83L655-104 668 334C540 394 331 479 188 500 38 521-34 562-127 636Z" />
          <path fill="none" stroke="url(#silk-edge)" strokeWidth="1.6" d="M-125 326C-20 200 64 215 167 156 284 88 311-43 429-83" />
        </g>
        <g className="silk-sweep">
          <path fill="url(#silk-sweep)" d="M660 140C496 154 421 221 316 297 211 374 101 333 24 392-55 453-97 531-128 667L664 757Z" />
          <path fill="none" stroke="url(#silk-sheen)" strokeWidth="26" filter="url(#silk-diffusion)" d="M660 147C496 161 421 228 316 304 211 381 101 340 24 399-55 460-97 538-128 674" />
          <path fill="none" stroke="url(#silk-edge)" strokeWidth="2" d="M660 140C496 154 421 221 316 297 211 374 101 333 24 392-55 453-97 531-128 667" />
        </g>
        <ellipse cx="2" cy="434" rx="326" ry="226" fill="url(#silk-glow)" />
      </svg>
    </div>
  );
}
