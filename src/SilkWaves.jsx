export default function SilkWaves() {
  return (
    <div className="silk-waves" aria-hidden="true">
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
