/* ============================================================
   TYPERIDER — post-traitement VFX (WebGL, sans dépendance)
   La scène pixel art est dessinée en 2D, puis passe ici par des
   shaders : lueur, rayons de lumière, reflets d'objectif,
   éclairage dynamique, ondes de choc, brume de chaleur, gouttes
   sur l'objectif, aberration chromatique, étalonnage et grain.
   ============================================================ */
(() => {
'use strict';

const HEAD = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
`;

const VS = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// extrait les zones lumineuses ; les couleurs saturées (néons, lave, lasers) brillent plus que le blanc
const FS_BRIGHT = HEAD + `
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uThr;
void main() {
  vec3 c = 0.25 * (texture2D(uTex, vUv + uTexel * vec2(-0.5, -0.5)).rgb + texture2D(uTex, vUv + uTexel * vec2(0.5, -0.5)).rgb
                 + texture2D(uTex, vUv + uTexel * vec2(-0.5, 0.5)).rgb + texture2D(uTex, vUv + uTexel * vec2(0.5, 0.5)).rgb);
  float mx = max(c.r, max(c.g, c.b));
  float mn = min(c.r, min(c.g, c.b));
  float sat = mx > 0.0 ? (mx - mn) / mx : 0.0;
  // luminosité perçue + bonus pour les couleurs vives : le ciel bleu ne « brille » pas, le néon oui
  float m = dot(c, vec3(0.2126, 0.7152, 0.0722)) + 0.35 * sat * mx;
  float k = smoothstep(uThr, uThr + 0.25, m);
  gl_FragColor = vec4(c * k, 1.0);
}
`;

// flou gaussien séparable (9 échantillons via le filtrage linéaire)
const FS_BLUR = HEAD + `
uniform sampler2D uTex;
uniform vec2 uDir;
void main() {
  vec3 c = texture2D(uTex, vUv).rgb * 0.227027;
  c += texture2D(uTex, vUv + uDir * 1.3846).rgb * 0.316216;
  c += texture2D(uTex, vUv - uDir * 1.3846).rgb * 0.316216;
  c += texture2D(uTex, vUv + uDir * 3.2308).rgb * 0.070270;
  c += texture2D(uTex, vUv - uDir * 3.2308).rgb * 0.070270;
  gl_FragColor = vec4(c, 1.0);
}
`;

// rayons volumétriques : flou radial des zones lumineuses vers le soleil
const FS_RAYS = HEAD + `
uniform sampler2D uTex;
uniform vec2 uSun;
uniform float uAspect;
void main() {
  vec2 delta = (vUv - uSun) / 48.0 * 0.92;
  vec2 uv = vUv;
  vec3 acc = vec3(0.0);
  float w = 1.0;
  for (int i = 0; i < 48; i++) {
    uv -= delta;
    acc += texture2D(uTex, uv).rgb * w;
    w *= 0.955;
  }
  vec2 d = (vUv - uSun) * vec2(uAspect, 1.0);
  gl_FragColor = vec4(acc / 48.0 * 2.4 / (1.0 + dot(d, d) * 7.0), 1.0);
}
`;

const FS_COMP = HEAD + `
uniform sampler2D uScene;
uniform sampler2D uBloomA;
uniform sampler2D uBloomB;
uniform sampler2D uRays;
uniform vec2 uRes;
uniform float uTime;
uniform vec4 uShock[8];      // x, y, rayon (en hauteurs d'écran), force
uniform vec4 uLight[8];      // x, y, rayon, intensité
uniform vec3 uLightCol[8];
uniform vec3 uSun;           // x, y, intensité
uniform float uBloom, uRaysOn, uFlare, uLightOn, uShockOn, uChroma, uHeat, uRain, uGrade, uGrain, uPulse;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// gouttes qui glissent sur l'objectif : xy = réfraction, z = masque
vec3 lensDrops(vec2 uv, float aspect, float t, float amount) {
  vec2 p = vec2(uv.x * aspect, uv.y) * 6.0;
  vec2 id = floor(p);
  vec2 f = fract(p);
  vec3 res = vec3(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 o = vec2(float(i), float(j));
      vec2 n = id + o;
      float h = hash(n);
      if (h > 1.0 - amount * 0.5) {
        float ph = fract(t * (0.04 + 0.05 * hash(n + 3.1)) + h);
        vec2 c = o + vec2(0.2 + 0.6 * hash(n + 1.7), 0.9 - ph * 0.8);
        float r = 0.10 + 0.16 * hash(n + 5.3);
        vec2 d = f - c;
        float len = length(d);
        float life = sin(ph * 3.14159);
        if (len < r) {
          float k = 1.0 - len / r;
          res.xy += d * k * life;
          res.z = max(res.z, k * life);
        }
      }
    }
  }
  return res;
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 A = vec2(aspect, 1.0);
  vec2 uv = vUv;

  // ondes de choc : anneaux de réfraction autour des explosions
  if (uShockOn > 0.5) {
    for (int i = 0; i < 8; i++) {
      vec4 s = uShock[i];
      if (s.w > 0.0) {
        vec2 d = (vUv - s.xy) * A;
        float dist = length(d);
        float ring = exp(-pow((dist - s.z) / 0.035, 2.0));
        uv -= (d / max(dist, 0.0001)) * ring * s.w * 0.025 / A;
      }
    }
  }
  // brume de chaleur près du sol
  if (uHeat > 0.0) {
    float m = smoothstep(0.5, 0.05, vUv.y) * uHeat;
    uv.x += (sin(vUv.y * 170.0 + uTime * 6.0) + 0.6 * sin(vUv.y * 63.0 - uTime * 3.7 + vUv.x * 25.0)) * 0.0011 * m;
    uv.y += sin(vUv.x * 95.0 + uTime * 4.3) * 0.0007 * m;
  }
  vec3 drop = vec3(0.0);
  if (uRain > 0.01) {
    drop = lensDrops(vUv, aspect, uTime, uRain);
    uv -= drop.xy * (0.35 / 6.0) / A;
  }

  // aberration chromatique (plus forte sur les bords et pendant les gros impacts)
  vec2 cd = uv - 0.5;
  float ca = uChroma * (0.0015 + 0.006 * uPulse);
  vec3 col = vec3(texture2D(uScene, uv + cd * ca).r, texture2D(uScene, uv).g, texture2D(uScene, uv - cd * ca).b);

  // éclairage dynamique : explosions, tirs et phares éclairent la scène
  if (uLightOn > 0.5) {
    vec3 lit = vec3(0.0);
    for (int i = 0; i < 8; i++) {
      vec4 L = uLight[i];
      if (L.w > 0.0) {
        vec2 d = (vUv - L.xy) * A;
        lit += uLightCol[i] * L.w * exp(-dot(d, d) / (L.z * L.z));
      }
    }
    col += col * lit * 1.3 + lit * 0.06;
  }

  col += (texture2D(uBloomA, uv).rgb * 0.75 + texture2D(uBloomB, uv).rgb * 1.0) * uBloom;
  col += texture2D(uRays, vUv).rgb * uSun.z * uRaysOn * 0.9;

  // reflets d'objectif : fantômes sur l'axe soleil-centre, halo et traînée anamorphique
  if (uFlare > 0.5 && uSun.z > 0.01) {
    vec2 s = uSun.xy;
    vec2 toC = vec2(0.5) - s;
    vec3 f = vec3(0.0);
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      vec2 gp = s + toC * (0.7 + fi * 0.55);
      float r = 0.015 + 0.035 * fract(fi * 0.37 + 0.2);
      float g = smoothstep(r, r * 0.55, length((vUv - gp) * A));
      f += g * mix(vec3(0.35, 0.6, 1.0), vec3(1.0, 0.55, 0.3), fract(fi * 0.61)) * 0.14;
    }
    float dl = length((vUv - s) * A);
    f += smoothstep(0.018, 0.0, abs(dl - 0.3)) * vec3(0.5, 0.7, 1.0) * 0.07;
    f += vec3(0.45, 0.65, 1.0) * exp(-abs(vUv.y - s.y) * 160.0) * exp(-abs(vUv.x - s.x) * 2.2) * 0.4;
    col += f * uSun.z;
  }

  // gouttes : bord légèrement sombre et reflet
  col = mix(col, col * 0.9, smoothstep(0.0, 0.2, drop.z) * (1.0 - smoothstep(0.2, 0.5, drop.z)) * 0.5);
  col += vec3(0.18) * smoothstep(0.8, 1.0, drop.z);

  // étalonnage cinéma : saturation, ombres bleutées, hautes lumières chaudes, contraste, vignette
  if (uGrade > 0.5) {
    float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
    vec3 g = mix(vec3(l), col, 1.18);
    g += mix(vec3(-0.02, 0.01, 0.04), vec3(0.04, 0.015, -0.03), smoothstep(0.1, 0.9, l));
    g = (g - 0.5) * 1.08 + 0.5;
    float v = length((vUv - 0.5) * A * 0.9);
    g *= 1.0 - 0.38 * smoothstep(0.35, 1.0, v);
    col = g;
  }
  if (uGrain > 0.5) col += (hash(vUv * uRes + fract(uTime * 7.0) * 91.0) - 0.5) * 0.05;
  gl_FragColor = vec4(col, 1.0);
}
`;

let gl = null, glCanvas = null, quad = null, srcTex = null;
const P = {};          // programmes
const T = {};          // cibles de rendu
let W = 0, H = 0;

function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

function program(fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, VS));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'aPos');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const loc = {};
  return { p, u: (name) => (name in loc ? loc[name] : (loc[name] = gl.getUniformLocation(p, name))) };
}

function texture(filter) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

function target(w, h) {
  const tex = texture(gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { tex, fb, w, h };
}

function init(c) {
  glCanvas = c;
  try {
    gl = c.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false });
    if (!gl) return false;
    P.bright = program(FS_BRIGHT);
    P.blur = program(FS_BLUR);
    P.rays = program(FS_RAYS);
    P.comp = program(FS_COMP);
  } catch (e) {
    console.warn('VFX indisponibles :', e);
    gl = null;
    return false;
  }
  quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  srcTex = texture(gl.NEAREST); // pixels nets : la scène reste en vrai pixel art
  return true;
}

function resize(w, h) {
  if (!gl) return;
  W = w; H = h;
  glCanvas.width = w;
  glCanvas.height = h;
  for (const k in T) { gl.deleteTexture(T[k].tex); gl.deleteFramebuffer(T[k].fb); }
  const d = (n) => [Math.max(1, Math.round(w / n)), Math.max(1, Math.round(h / n))];
  T.half = target(...d(2));
  T.qa = target(...d(4));
  T.qb = target(...d(4));
  T.ea = target(...d(8));
  T.eb = target(...d(8));
  T.rays = target(...d(4));
  // cible noire utilisée quand un effet est coupé
  T.black = target(1, 1);
}

function bindTex(unit, tex) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
}

function run(prog, dst, setup) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fb : null);
  gl.viewport(0, 0, dst ? dst.w : W, dst ? dst.h : H);
  gl.useProgram(prog.p);
  setup(prog.u);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function blur(src, dst, dx, dy) {
  run(P.blur, dst, (u) => {
    bindTex(0, src.tex);
    gl.uniform1i(u('uTex'), 0);
    gl.uniform2f(u('uDir'), dx / src.w, dy / src.h);
  });
}

/* p = { time, on: {bloom, rays, flare, light, shock, chroma, heat, drops, grade, grain},
         sun: [x, y, intensité] (x, y en fraction de l'écran, y vers le bas),
         shocks: [{x, y, r, s}] et lights: [{x, y, r, i, col: [r,g,b]}] en pixels,
         heat, rain, pulse (0..1), thr : seuil de lueur (plus bas la nuit) } */
function render(src, p) {
  if (!gl) return;
  gl.bindTexture(gl.TEXTURE_2D, srcTex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  const on = p.on;
  const sunUv = [p.sun[0], 1 - p.sun[1]];
  const needBright = on.bloom || (on.rays && p.sun[2] > 0.02);
  if (needBright) {
    run(P.bright, T.half, (u) => {
      bindTex(0, srcTex);
      gl.uniform1i(u('uTex'), 0);
      gl.uniform2f(u('uTexel'), 1 / W, 1 / H);
      gl.uniform1f(u('uThr'), p.thr);
    });
  }
  if (on.bloom) {
    blur(T.half, T.qa, 1, 0);
    blur(T.qa, T.qb, 0, 1);
    blur(T.qb, T.ea, 1, 0);
    blur(T.ea, T.eb, 0, 1);
  }
  const raysOn = on.rays && p.sun[2] > 0.02;
  if (raysOn) {
    run(P.rays, T.rays, (u) => {
      bindTex(0, T.half.tex);
      gl.uniform1i(u('uTex'), 0);
      gl.uniform2f(u('uSun'), sunUv[0], sunUv[1]);
      gl.uniform1f(u('uAspect'), W / H);
    });
  }

  const shock = new Float32Array(32), light = new Float32Array(32), lcol = new Float32Array(24);
  (p.shocks || []).slice(0, 8).forEach((s, i) => shock.set([s.x / W, 1 - s.y / H, s.r / H, s.s], i * 4));
  (p.lights || []).slice(0, 8).forEach((l, i) => {
    light.set([l.x / W, 1 - l.y / H, l.r / H, l.i], i * 4);
    lcol.set(l.col, i * 3);
  });

  run(P.comp, null, (u) => {
    bindTex(0, srcTex);
    bindTex(1, on.bloom ? T.qb.tex : T.black.tex);
    bindTex(2, on.bloom ? T.eb.tex : T.black.tex);
    bindTex(3, raysOn ? T.rays.tex : T.black.tex);
    gl.uniform1i(u('uScene'), 0);
    gl.uniform1i(u('uBloomA'), 1);
    gl.uniform1i(u('uBloomB'), 2);
    gl.uniform1i(u('uRays'), 3);
    gl.uniform2f(u('uRes'), W, H);
    gl.uniform1f(u('uTime'), p.time % 1000);
    gl.uniform4fv(u('uShock'), shock);
    gl.uniform4fv(u('uLight'), light);
    gl.uniform3fv(u('uLightCol'), lcol);
    gl.uniform3f(u('uSun'), sunUv[0], sunUv[1], p.sun[2]);
    gl.uniform1f(u('uBloom'), on.bloom ? 1 : 0);
    gl.uniform1f(u('uRaysOn'), raysOn ? 1 : 0);
    gl.uniform1f(u('uFlare'), on.flare ? 1 : 0);
    gl.uniform1f(u('uLightOn'), on.light ? 1 : 0);
    gl.uniform1f(u('uShockOn'), on.shock ? 1 : 0);
    gl.uniform1f(u('uChroma'), on.chroma ? 1 : 0);
    gl.uniform1f(u('uHeat'), on.heat ? p.heat : 0);
    gl.uniform1f(u('uRain'), on.drops ? p.rain : 0);
    gl.uniform1f(u('uGrade'), on.grade ? 1 : 0);
    gl.uniform1f(u('uGrain'), on.grain ? 1 : 0);
    gl.uniform1f(u('uPulse'), p.pulse);
  });
}

window.TRVfx = {
  init, resize, render,
  get ok() { return !!gl; },
};

})();
