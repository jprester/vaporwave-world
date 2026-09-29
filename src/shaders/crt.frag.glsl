// CRT screen: shows the live island feed through a curved, scanlined,
// slightly unstable tube. uMode picks what the set is tuned to:
//   0 = the feed, 1 = static (no station), 2 = blue "no signal" screen.

varying vec2 vUv;

uniform sampler2D uFeed;
uniform float uHasFeed;
uniform float uTime;
uniform float uSeed;
uniform float uMode;
uniform float uBrightness;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  // Barrel distortion: the glass bulges toward the viewer.
  vec2 c = vUv * 2.0 - 1.0;
  c *= 1.0 + 0.06 * dot(c, c);
  vec2 uv = c * 0.5 + 0.5;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  float t = uTime + uSeed * 17.0;

  // Horizontal sync wobble, strongest inside the rolling bar.
  float roll = fract(uv.y * 0.6 - t * 0.07);
  float bar = smoothstep(0.0, 0.08, roll) * (1.0 - smoothstep(0.08, 0.2, roll));
  uv.x += (sin(uv.y * 90.0 + t * 7.0) * 0.0012) + bar * 0.004;

  vec3 col;
  if (uMode < 0.5) {
    // Slight RGB misconvergence.
    col.r = texture2D(uFeed, uv + vec2(0.0015, 0.0)).r;
    col.g = texture2D(uFeed, uv).g;
    col.b = texture2D(uFeed, uv - vec2(0.0015, 0.0)).b;
    // Until the feed has rendered once, show a dim idle tube.
    col = mix(vec3(0.02, 0.02, 0.03), col, uHasFeed);
  } else if (uMode < 1.5) {
    float n = hash(floor(uv * vec2(160.0, 120.0)) + floor(t * 24.0));
    col = vec3(n) * 0.55;
  } else {
    col = vec3(0.05, 0.12, 0.85) * 0.9;
  }

  // Scanlines, a brighter rolling band and fine grain.
  col *= 0.78 + 0.22 * sin(uv.y * 3.14159 * 220.0);
  col *= 1.0 + bar * 0.18;
  col += (hash(uv * 400.0 + t) - 0.5) * 0.04;

  // Darkened tube edges.
  vec2 e = smoothstep(vec2(0.0), vec2(0.07), uv) * smoothstep(vec2(0.0), vec2(0.07), 1.0 - uv);
  col *= e.x * e.y;

  gl_FragColor = vec4(max(col, 0.0) * uBrightness, 1.0);
}
