const vertexSource = `
  attribute vec2 position;

  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentSource = `
  precision highp float;
  uniform vec2 resolution;
  uniform float time;

  float grain(vec2 pixel) {
    vec3 hash = fract(vec3(pixel.xyx) * vec3(0.1031, 0.1030, 0.0973));
    hash += dot(hash, hash.yzx + 33.33);
    return fract((hash.x + hash.y) * hash.z);
  }

  void main() {
    vec2 screen = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y) / resolution;
    vec2 point = (screen - 0.5) * vec2(resolution.x / resolution.y, 1.0);
    // Travel towards the lower left along the normal of the folds.
    vec2 p = vec2(dot(point, vec2(-0.69, 0.724)), dot(point, vec2(0.724, 0.69)));
    float clock = time * 0.95;
    p *= 5.4;

    // Slow domain warps pull broad bands into curls with narrower seams.
    float curl = cos(p.y * 1.58 - p.x * 0.73 + 0.82 * sin(clock));
    p.y += 0.83 * sin(p.x * 1.1 + curl + 0.28 * sin(clock * 1.7));
    p.x += 1.03 * sin(p.y * 1.43 + 0.58 * cos(p.x * 1.3 - clock));
    p.x += 0.29 * sin(p.y * 2.7 + p.x * 1.1 + clock * 0.66);
    float fold = sin(1.86 * p.x - clock + 0.44 * cos(p.y * 2.0));
    float seam = exp(-abs(fold - 0.60) * 8.0);
    float body = smoothstep(-0.98, 0.83, fold);
    float light = 0.5 + 0.5 * sin(p.y * 1.9 - p.x * 0.66 + 0.38 * sin(clock));

    vec3 plum = vec3(0.42, 0.34, 0.57);
    vec3 violet = vec3(0.60, 0.51, 0.72);
    vec3 iris = vec3(0.76, 0.69, 0.84);
    vec3 pearl = vec3(0.95, 0.92, 0.96);
    vec3 shade = mix(plum, violet, 0.24 + 0.59 * light);
    vec3 color = mix(shade, iris, smoothstep(0.08, 0.73, body));
    color = mix(color, pearl, smoothstep(0.66, 1.0, body) * 0.91);
    color = mix(color, pearl, seam * 0.16);

    // Keep the Home title legible even when a pale fold passes behind it.
    vec2 title = (screen - vec2(0.50, 0.215)) * vec2(1.15, 3.6);
    color = mix(color, plum, 0.38 * exp(-dot(title, title) * 4.0));

    // Grain stays fixed to the display so the texture never flickers.
    float fineGrain = grain(floor(gl_FragCoord.xy));
    float softGrain = grain(floor(gl_FragCoord.xy * 0.55));
    color += (0.72 * fineGrain + 0.28 * softGrain - 0.5) * 0.125;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createSilkRenderer(canvas) {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!gl) return null;

  const vertex = gl.createShader(gl.VERTEX_SHADER);
  const fragment = gl.createShader(gl.FRAGMENT_SHADER);
  const program = gl.createProgram();
  const vertices = gl.createBuffer();
  const dispose = () => {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    gl.deleteProgram(program);
    gl.deleteBuffer(vertices);
  };
  if (!vertex || !fragment || !program || !vertices) {
    dispose();
    return null;
  }

  gl.shaderSource(vertex, vertexSource);
  gl.shaderSource(fragment, fragmentSource);
  gl.compileShader(vertex);
  gl.compileShader(fragment);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    dispose();
    return null;
  }

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  const resolution = gl.getUniformLocation(program, 'resolution');
  const time = gl.getUniformLocation(program, 'time');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  return {
    resize(width, height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      gl.uniform2f(resolution, width, height);
    },
    draw(seconds) {
      gl.uniform1f(time, seconds);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose,
  };
}
