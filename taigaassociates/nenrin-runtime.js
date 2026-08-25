/*!
 * nenrin-runtime.js — TAIGA ASSOCIATES 年輪ラインアート ランタイム
 *
 * ウェブサイト組み込み用のエンジン。オーサリングは nenrin-lineart-tester.html
 * で行い、書き出された設定オブジェクトをこのランタイムに渡して描画します。
 *
 *   <canvas id="art" style="width:100%;height:100%"></canvas>
 *   <script src="nenrin-runtime.js"></script>
 *   <script>
 *     var art = NenrinArt.create(document.getElementById('art'), MY_CONFIG_A);
 *     art.transitionTo(MY_CONFIG_B, { duration: 1400 });
 *   </script>
 *
 * 遷移は2方式を自動で使い分けます（NenrinArt.canMorph で事前判定可）:
 *   morph     … 構造パラメータが一致する場合。形状そのものが連続変形します。
 *   crossfade … 構造が異なる場合。両者を同時描画し不透明度で入れ替えます。
 *               カメラは常に数値補間されるため、視点は途切れずに繋がります。
 */
(function (global) {
  "use strict";

  // ---------------------------------------------------------------
  // Noise (seeded, seamless-around-circle value noise)
  // ---------------------------------------------------------------
  function makeNoise2D(seed){
    function hash(x,y){
      var n = Math.sin(x*127.1 + y*311.7 + seed*74.7312) * 43758.5453123;
      return n - Math.floor(n);
    }
    function lerp(a,b,t){ return a + (b-a)*t; }
    return function noise2D(x,y){
      var xi = Math.floor(x), yi = Math.floor(y);
      var xf = x - xi, yf = y - yi;
      var u = xf*xf*(3-2*xf), v = yf*yf*(3-2*yf);
      var a = hash(xi,yi),     b = hash(xi+1,yi);
      var c = hash(xi,yi+1),   d = hash(xi+1,yi+1);
      return (lerp(lerp(a,b,u), lerp(c,d,u), v) * 2 - 1);
    };
  }
  // ---------------------------------------------------------------
  // Geometry builder — concentric, organically-perturbed ring paths
  // ---------------------------------------------------------------
  // Only structural ring placement (count, spacing, eccentricity, ring-to-ring
  // growth variance) is baked into geometry. The fine per-angle "wood grain"
  // wobble is computed live in the vertex shader (see uIrregAmt/uWobbleSpeed)
  // so it can animate continuously and react to the mouse without CPU rebuilds.
  function buildRingGeometry(p){
    var noise = makeNoise2D(p.seed);
    var ringCount = Math.max(1, p.ringCount|0);
    var segments = Math.max(8, p.segments|0);
    var eccRad = p.eccentricityAngle * Math.PI / 180;
    var ecx = Math.cos(eccRad), ecy = Math.sin(eccRad);
    var eccDenomInv = 1 / Math.max(1, ringCount - 1);

    // What actually gets baked is the pair (ringPos, growth) rather than a
    // finished x/y, because radius and centre are *affine* in baseRadius,
    // spacing, spacingVarAmt, eccentricity and eccentricityAngle:
    //
    //   r      = baseRadius + ringPos*spacing + growth*spacing*spacingVarAmt
    //   centre = eccDir * eccentricity * ringPos * eccDenomInv
    //
    // So those five are evaluated in the vertex shader from uniforms and stay
    // freely tweenable — which is what lets two arts differing in them morph
    // instead of crossfading. Only seed, spacingVarFreq and spiralBlend (which
    // pick *which* noise and how the rings chain) have to be baked here.
    //
    // growth is sampled at both the ring's integer index (the "stepped"
    // concentric value) and at the continuous spiral position u — the noise
    // itself is smooth, but sampling it once per ring makes it jump at every
    // ring boundary. Mixing the two by spiralBlend keeps stepped rings blocky
    // (as intended) while spiralBlend===1 uses the u sample alone, which never
    // jumps, so a fully chained spiral has no per-ring "kink" for the joins
    // to reveal.
    function growthNorm(u){
      return noise(u * p.spacingVarFreq * 0.5 + 100, p.seed * 0.017) * u * 0.02;
    }
    function radialAt(i, u){
      var ringPos = i + (u - i) * spiralBlend;
      var gi = growthNorm(i), gu = growthNorm(u);
      return [ringPos, gi + (gu - gi) * spiralBlend];
    }
    // Where the vertex lands at the layer's *authored* parameter values. Used
    // only to derive the extrusion normal: the normal is perpendicular to the
    // ring's tangent, and none of the five shader-side parameters rotate that
    // tangent (they scale the radius or translate the ring centre), so a
    // normal baked here stays correct while they are tweened.
    function toXY(radial, dirx, diry){
      var r = Math.max(0.4, p.baseRadius + radial[0] * p.spacing
                            + radial[1] * p.spacing * p.spacingVarAmt);
      var d = p.eccentricity * radial[0] * eccDenomInv;
      return [ecx * d + dirx * r, ecy * d + diry * r];
    }

    // Every sample point also gets a small round "joint" fan (see pushJoint).
    // Segment quads alone leave a visible notch wherever the shader-side wobble/
    // twist/deform bends the line sharply, since each quad only knows its own
    // straight extent — the joint disc bridges that gap and rounds the corner,
    // and since it shares the same aPos/aDir/aRing as the segment endpoint it
    // sits on, it animates identically (wobble/deform/twist all happen on GPU).
    //
    // At spiralBlend===1 each ring's end radius is meant to hand off to the
    // next ring's start, but per-ring growth-variance noise means they don't
    // land on exactly the same point — left as separate arcs that only looked
    // "close enough", the gap reads as a seam. So at full spiral blend the
    // rings are chained into one continuous polyline (prevX carries over
    // instead of resetting), and an explicit quad bridges the two points.
    var spiralBlend = p.spiralBlend || 0;
    var chainRings = spiralBlend >= 0.999;
    var quadCount = ringCount * segments + (chainRings ? Math.max(0, ringCount - 1) : 0);
    var joinCount = ringCount * (segments + 1);
    var totalVerts = quadCount * 6 + joinCount * JOIN_VERTS;
    var buf = new Float32Array(totalVerts * 9);
    var o = 0;

    var prevX = null, prevY = null, prevDx = null, prevDy = null, prevRing = 0, prevU = 0;
    var prevR0 = 0, prevR1 = 0;
    for (var i = 0; i < ringCount; i++){
      if (!chainRings){ prevX = null; prevY = null; prevDx = null; prevDy = null; }
      for (var j = 0; j <= segments; j++){
        // u is the continuous "how far around the whole spiral" position —
        // radiusAt/centerAt use it (vs. the ring's fixed integer index) for
        // the spiralBlend===1 continuous case so nothing jumps at ring seams.
        var u = i + j / segments;
        // wobbleU is what actually goes to the shader as aU, for the fine
        // wobble noise specifically (see uIrregFreq/wobble in the shader —
        // aRing itself stays discrete there, since growth-wave/twist/bulge/
        // mobius all want to step per ring). It must NOT just be u: at
        // spiralBlend 0 a ring is its own closed loop, so its own j=0 and
        // j=segments (both angle 0) need the SAME wobble coordinate (u would
        // give i vs i+1 — different lattice cell, a fresh seam). Scaling the
        // fractional part by spiralBlend collapses that back to a single
        // value at 0 while staying equal to u at 1, where rings truly chain.
        var wobbleU = i + spiralBlend * (j / segments);
        var theta = (j / segments) * Math.PI * 2;
        var dirx = Math.cos(theta), diry = Math.sin(theta);
        var radial = radialAt(i, u);
        var xy = toXY(radial, dirx, diry);
        var x = xy[0], y = xy[1];
        if (prevX !== null){
          var dx = x - prevX, dy = y - prevY;
          var len = Math.hypot(dx, dy);
          var nx, ny;
          if (len > 1e-4){
            nx = -dy / len; ny = dx / len;
          } else {
            // near-zero-length segment (the ring-to-ring bridge when
            // spiralBlend===1 lands almost exactly on the next ring's start)
            // — deriving a normal from dx/dy here is just floating-point
            // noise, which showed up as a small per-ring notch. Falling back
            // to this point's own radial-perpendicular direction keeps the
            // (invisible, near-zero-width) bridge quad's orientation sane.
            nx = -diry; ny = dirx;
          }
          // prevRing/prevU differ from i/u only for the one bridging quad
          // that chains ring i-1's last point to ring i's first (chainRings)
          // — keep that vertex's aRing/aU correct so it animates (wobble/
          // growth/twist/etc) identically to how ring i-1 itself rendered
          // it, or the bridge would re-introduce its own seam.
          // A(prev,+1) B(prev,-1) C(cur,+1) D(cur,-1) -> A,B,C, C,B,D
          o = pushV(buf, o, prevR0, prevR1, prevDx, prevDy, prevRing, prevU, nx, ny, 1);
          o = pushV(buf, o, prevR0, prevR1, prevDx, prevDy, prevRing, prevU, nx, ny, -1);
          o = pushV(buf, o, radial[0], radial[1], dirx, diry, i, wobbleU, nx, ny, 1);
          o = pushV(buf, o, radial[0], radial[1], dirx, diry, i, wobbleU, nx, ny, 1);
          o = pushV(buf, o, prevR0, prevR1, prevDx, prevDy, prevRing, prevU, nx, ny, -1);
          o = pushV(buf, o, radial[0], radial[1], dirx, diry, i, wobbleU, nx, ny, -1);
        }
        o = pushJoint(buf, o, radial[0], radial[1], dirx, diry, i, wobbleU);
        prevX = x; prevY = y; prevDx = dirx; prevDy = diry; prevRing = i; prevU = wobbleU;
        prevR0 = radial[0]; prevR1 = radial[1];
      }
    }
    return buf;
  }
  // r0/r1 are the baked radial pair (ringPos, growth) — the shader turns them
  // into an x/y using the current uniforms. See buildRingGeometry.
  function pushV(buf, o, r0, r1, dx, dy, ring, u, nx, ny, side){
    buf[o] = r0; buf[o+1] = r1; buf[o+2] = dx; buf[o+3] = dy; buf[o+4] = ring;
    buf[o+5] = u; buf[o+6] = nx; buf[o+7] = ny; buf[o+8] = side;
    return o + 9;
  }
  var JOIN_SIDES = 5, JOIN_VERTS = JOIN_SIDES * 3;
  function pushJoint(buf, o, r0, r1, dx, dy, ring, u){
    for (var k = 0; k < JOIN_SIDES; k++){
      var a0 = (k / JOIN_SIDES) * Math.PI * 2;
      var a1 = ((k + 1) / JOIN_SIDES) * Math.PI * 2;
      o = pushV(buf, o, r0, r1, dx, dy, ring, u, 0, 0, 0);
      o = pushV(buf, o, r0, r1, dx, dy, ring, u, Math.cos(a0), Math.sin(a0), 1);
      o = pushV(buf, o, r0, r1, dx, dy, ring, u, Math.cos(a1), Math.sin(a1), 1);
    }
    return o;
  }
  // ---------------------------------------------------------------
  // Layer model
  // ---------------------------------------------------------------
  function defaultLayer(overrides){
    var d = {
      id: 'L' + (Math.random()*1e6|0),
      name: '層',
      enabled: true,
      ringCount: 90,
      segments: 180,
      baseRadius: 60,
      spacing: 6.5,
      spacingVarAmt: 0.4,
      spacingVarFreq: 0.7,
      irregAmt: 4,
      irregFreq: 3.2,
      eccentricity: 0,
      eccentricityAngle: 0,
      rotation: 0,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      rotateSpeed: 0,
      lineWidth: 0.8,
      opacity: 0.85,
      color: '#35322d',
      blend: 'normal',
      seed: (Math.random()*1000|0),
      wobbleSpeed: 0.18,
      breatheAmp: 0.015,
      breatheSpeed: 0.4,
      deformStrength: 30,
      deformRadius: 220,
      deformMode: 'mouse',
      deformType: 'push',
      anchorX: 0,
      anchorY: 0,
      spiralBlend: 0,
      spiralZ: 0.6,
      depthOffset: 0,
      twistPerRing: 0,
      bulgeAmt: 0,
      mobiusAmt: 0,
      mobiusFreq: 1,
      mobiusRingTwist: 0,
      growthSpeed: 0.12,
      growthWaveCount: 4,
      growthAmt: 0.4,
      shapeMode: 'none',
      shapeMorph: 0,
      shapeRadius: 180,
      shapeRadius2: 40,
      shapeTurns: 4,
      shapeHeight: 320,
      shapeTwist: 3,
      rippleAmt: 0,
      rippleFreq: 4,
      rippleSpeed: 0.15,
      twistSpeed: 0,
      ringWidthVar: 0.35,
      ringOpacityVar: 0.35,
      ringWobbleVar: 0.4,
      ringDrift: 3.5,
      rot3DX: 0,
      rot3DY: 0
    };
    for (var k in overrides) d[k] = overrides[k];
    return d;
  }

  // =================================================================
  // Parameter classification — what can be tweened vs. what needs a
  // CPU geometry rebuild. This split is what makes seamless transitions
  // between two arts possible (see transitionTo / canMorph).
  // =================================================================

  // Baked into the vertex buffer by buildRingGeometry: changing any of
  // these requires regenerating geometry, so two configs that differ here
  // cannot morph into each other and are crossfaded instead.
  //
  // ringCount / segments change the vertex count outright, spiralBlend
  // changes whether rings are separate loops or one chained spiral, and
  // seed / spacingVarFreq pick which noise gets sampled. Everything that used
  // to live here — baseRadius, spacing, spacingVarAmt, eccentricity,
  // eccentricityAngle — is now resolved in the vertex shader and tweens
  // freely, which is what makes most pairs of arts morphable.
  var STRUCTURAL_KEYS = [
    'ringCount', 'segments', 'spiralBlend', 'spacingVarFreq', 'seed'
  ];

  // Non-numeric / non-interpolatable: snapped at the midpoint of a morph.
  var LAYER_DISCRETE_KEYS = ['id', 'name', 'enabled', 'blend', 'deformMode', 'deformType', 'shapeMode'];
  var LAYER_COLOR_KEYS = ['color'];

  // Everything else on a layer is a plain shader uniform -> freely tweenable.
  var _protoLayer = defaultLayer();
  var LAYER_NUM_KEYS = Object.keys(_protoLayer).filter(function (k) {
    return typeof _protoLayer[k] === 'number'
      && STRUCTURAL_KEYS.indexOf(k) < 0
      && LAYER_DISCRETE_KEYS.indexOf(k) < 0;
  });

  var CAM_NUM_KEYS = ['globalScale', 'mouseStrength', 'tiltX', 'tiltY', 'perspective', 'tiltSpeed'];
  var CAM_COLOR_KEYS = ['bgColor', 'textColor'];
  var CAM_BOOL_KEYS = ['autoRotate', 'mouseReact', 'mouseDeform', 'autoTilt'];

  function defaultCamera() {
    return {
      bgColor: '#f2f0e9', textColor: '#2c2925', globalScale: 1,
      autoRotate: true, mouseReact: true, mouseStrength: 40, mouseDeform: true,
      tiltX: 32, tiltY: -14, perspective: 22, autoTilt: true, tiltSpeed: 2.5
    };
  }

  function defaultConfig() {
    var c = defaultCamera();
    c.layers = [defaultLayer()];
    return c;
  }

  // Accepts either the flat runtime shape ({...camera, layers}) or the
  // tester's JSON snapshot shape ({ global: {...}, layers: [...] }).
  function normalizeConfig(cfg) {
    cfg = cfg || {};
    var flat = cfg.global ? Object.assign({}, cfg.global, { layers: cfg.layers }) : cfg;
    var out = defaultCamera();
    Object.keys(out).forEach(function (k) {
      if (flat[k] !== undefined) out[k] = flat[k];
    });
    var list = Array.isArray(flat.layers) && flat.layers.length ? flat.layers : [defaultLayer()];
    out.layers = list.map(function (l) { return defaultLayer(l); });
    return out;
  }

  function cloneConfig(src) {
    var out = {};
    Object.keys(src).forEach(function (k) { if (k !== 'layers') out[k] = src[k]; });
    out.layers = src.layers.map(function (l) { return Object.assign({}, l); });
    return out;
  }

  // True when the two configs share every structural parameter, meaning a
  // real geometric morph is possible instead of a crossfade.
  function canMorph(a, b) {
    a = normalizeConfig(a); b = normalizeConfig(b);
    if (a.layers.length !== b.layers.length) return false;
    for (var i = 0; i < a.layers.length; i++) {
      for (var k = 0; k < STRUCTURAL_KEYS.length; k++) {
        var key = STRUCTURAL_KEYS[k];
        if (a.layers[i][key] !== b.layers[i][key]) return false;
      }
    }
    return true;
  }

  var EASINGS = {
    linear: function (t) { return t; },
    easeOutCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
    easeInOutQuad: function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    easeInOutCubic: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  };

  function mixHex(a, b, t) {
    var A = parseInt(String(a).replace('#', ''), 16);
    var B = parseInt(String(b).replace('#', ''), 16);
    if (isNaN(A) || isNaN(B)) return t < 0.5 ? a : b;
    var r = Math.round(((A >> 16) & 255) + ((((B >> 16) & 255)) - ((A >> 16) & 255)) * t);
    var g = Math.round(((A >> 8) & 255) + ((((B >> 8) & 255)) - ((A >> 8) & 255)) * t);
    var bl = Math.round((A & 255) + ((B & 255) - (A & 255)) * t);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  }

  // =================================================================
  // Instance factory
  // =================================================================
  function create(canvasEl, config, opts) {
    opts = opts || {};
    var onStats = opts.onStats || null;
    // Idle motion left running under a transition (see render / transitionTo).
    var defaultCalm = opts.calm === undefined ? 0.15 : Math.max(0, Math.min(1, opts.calm));

  // ---------------------------------------------------------------
  // WebGL setup
  // ---------------------------------------------------------------
  var canvas = canvasEl;
  var gl = canvas.getContext('webgl', { antialias: true, alpha: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('NenrinArt: WebGL is not supported in this browser.');

  var VERT_SRC = [
    "attribute vec2 aRadial;",   // x = ringPos, y = growth (see buildRingGeometry)
    "attribute vec2 aDir;",
    "attribute float aRing;",
    "attribute float aU;",
    "attribute vec2 aNormal;",
    "attribute float aSide;",
    "uniform mat3 uTransform;",
    "uniform mat2 uRotMat;",
    "uniform vec2 uResolution;",
    "uniform float uLineWidthPx;",
    "uniform float uTime;",
    "uniform float uIrregAmt;",
    "uniform float uIrregFreq;",
    "uniform float uWobbleSpeed;",
    "uniform vec2 uSeedOffset;",
    "uniform vec2 uAnchorLocal;",
    "uniform float uDeformStrength;",
    "uniform float uDeformRadius;",
    "uniform int uDeformType;",
    "uniform vec2 uCenterPx;",
    "uniform vec2 uTiltXTrig;",
    "uniform vec2 uTiltYTrig;",
    "uniform float uFocal;",
    "uniform float uSpiralZ;",
    "uniform float uDepthOffset;",
    "uniform float uRingCountInv;",
    "uniform float uBaseRadius;",
    "uniform float uSpacing;",
    "uniform float uSpacingVarAmt;",
    "uniform float uEccentricity;",
    "uniform float uEccDenomInv;",
    "uniform vec2 uEccDir;",
    "uniform float uBulgeAmt;",
    "uniform float uTwistPerRing;",
    "uniform float uMobiusAmt;",
    "uniform float uMobiusFreq;",
    "uniform float uMobiusRingTwist;",
    "uniform float uGrowthSpeed;",
    "uniform float uGrowthWaveCount;",
    "uniform float uGrowthAmt;",
    "uniform int uShapeMode;",
    "uniform float uShapeMorph;",
    "uniform float uShapeRadius;",
    "uniform float uShapeRadius2;",
    "uniform float uShapeTurns;",
    "uniform float uShapeHeight;",
    "uniform float uShapeTwist;",
    "uniform float uShapeScale;",
    "uniform float uRippleAmt;",
    "uniform float uRippleFreq;",
    "uniform float uRippleSpeed;",
    "uniform float uTwistSpeed;",
    "uniform float uRingWidthVar;",
    "uniform float uRingOpacityVar;",
    "uniform float uRingWobbleVar;",
    "uniform float uRingDrift;",
    "uniform float uRot3DX;",
    "uniform float uRot3DY;",
    "varying float vEdge;",
    "varying float vGrowth;",
    "varying float vRingOpacity;",
    "float hash3(vec3 p){",
    "  return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453123);",
    "}",
    "float noise3D(vec3 x){",
    "  vec3 i = floor(x);",
    "  vec3 f = fract(x);",
    "  f = f*f*(3.0-2.0*f);",
    "  float n000 = hash3(i+vec3(0.0,0.0,0.0));",
    "  float n100 = hash3(i+vec3(1.0,0.0,0.0));",
    "  float n010 = hash3(i+vec3(0.0,1.0,0.0));",
    "  float n110 = hash3(i+vec3(1.0,1.0,0.0));",
    "  float n001 = hash3(i+vec3(0.0,0.0,1.0));",
    "  float n101 = hash3(i+vec3(1.0,0.0,1.0));",
    "  float n011 = hash3(i+vec3(0.0,1.0,1.0));",
    "  float n111 = hash3(i+vec3(1.0,1.0,1.0));",
    "  float nx00 = mix(n000,n100,f.x);",
    "  float nx10 = mix(n010,n110,f.x);",
    "  float nx01 = mix(n001,n101,f.x);",
    "  float nx11 = mix(n011,n111,f.x);",
    "  float nxy0 = mix(nx00,nx10,f.y);",
    "  float nxy1 = mix(nx01,nx11,f.y);",
    "  return mix(nxy0,nxy1,f.z) * 2.0 - 1.0;",
    "}",
    "void main(){",
    "  float ringHashW = fract(sin(aRing * 12.9898 + uSeedOffset.x * 78.233 + 4.7) * 43758.5453123);",
    "  float ringHashO = fract(sin(aRing * 39.3468 + uSeedOffset.y * 11.135 + 19.19) * 24634.6345);",
    "  float ringHashN = fract(sin(aRing * 71.2351 + uSeedOffset.x * 3.719 + uSeedOffset.y * 5.331 + 91.7) * 12945.734);",
    "  float ringWidthMod = max(0.15, 1.0 + (ringHashW - 0.5) * 2.0 * uRingWidthVar);",
    "  float ringOpacityMod = clamp(1.0 + (ringHashO - 0.5) * 2.0 * uRingOpacityVar, 0.15, 1.35);",
    "  float ringWobbleMod = max(0.0, 1.0 + (ringHashN - 0.5) * 2.0 * uRingWobbleVar);",
    "  vRingOpacity = ringOpacityMod;",
    "  float ringDrift = aU * uRingCountInv * uRingDrift;",
    "  float nx = aDir.x * uIrregFreq + aU * 0.37 + uSeedOffset.x + ringDrift * 0.71;",
    "  float ny = aDir.y * uIrregFreq + aU * 0.37 + uSeedOffset.y - ringDrift * 0.53;",
    "  float t = mod(uTime * uWobbleSpeed, 4000.0);",
    "  float wob = noise3D(vec3(nx, ny, t)) * uIrregAmt * ringWobbleMod;",
    // Ring placement is resolved here rather than baked, so baseRadius /
    // spacing / spacingVarAmt / eccentricity / eccentricityAngle can be
    // interpolated between two arts (see buildRingGeometry).
    "  float ringPos = aRadial.x;",
    "  float ringR = max(0.4, uBaseRadius + ringPos * uSpacing",
    "                  + aRadial.y * uSpacing * uSpacingVarAmt);",
    "  vec2 ringCenter = uEccDir * (uEccentricity * ringPos * uEccDenomInv);",
    "  vec2 basePos = ringCenter + aDir * ringR;",
    "  vec2 animated = basePos + aDir * wob;",
    "  vec2 smoothPos = basePos;",
    "  float ringN = clamp(aRing * uRingCountInv, 0.0, 1.0);",
    "  float ripplePhase = ringN * uRippleFreq - uTime * uRippleSpeed;",
    "  float ripple = uRippleAmt * sin(ripplePhase * 6.28318530718);",
    "  animated += aDir * ripple;",
    "  smoothPos += aDir * ripple;",
    "  float growthPhase = ringN * uGrowthWaveCount - uTime * uGrowthSpeed;",
    "  float growthWave = 0.5 + 0.5 * cos(growthPhase * 6.28318530718);",
    "  vGrowth = mix(1.0, growthWave, uGrowthAmt);",
    "  float bulgeScale = 1.0 + uBulgeAmt * sin(ringN * 3.14159265);",
    "  animated *= bulgeScale;",
    "  smoothPos *= bulgeScale;",
    "  float twistAng = aRing * uTwistPerRing + uTime * uTwistSpeed;",
    "  float twc = cos(twistAng), tws = sin(twistAng);",
    "  animated = vec2(animated.x*twc - animated.y*tws, animated.x*tws + animated.y*twc);",
    "  smoothPos = vec2(smoothPos.x*twc - smoothPos.y*tws, smoothPos.x*tws + smoothPos.y*twc);",
    "  float theta = atan(aDir.y, aDir.x);",
    "  float mobiusPhase = theta * uMobiusFreq + aRing * uMobiusRingTwist;",
    "  float existingZ = aRing * uSpiralZ + uDepthOffset + sin(mobiusPhase) * uMobiusAmt;",
    "  float shapeZ = existingZ;",
    "  if (uShapeMode != 0) {",
    "    float tAlong = theta / 6.28318530718;",
    "    if (tAlong < 0.0) tAlong += 1.0;",
    "    float shapeR = uShapeRadius + ripple;",
    "    float Xt = 0.0, Yt = 0.0, Zt = 0.0;",
    "    if (uShapeMode == 1) {",
    "      float phi = ringN * 3.14159265;",
    "      float sinPhi = sin(phi), cosPhi = cos(phi);",
    "      Xt = shapeR * sinPhi * aDir.x;",
    "      Yt = shapeR * sinPhi * aDir.y;",
    "      Zt = shapeR * cosPhi;",
    "    } else if (uShapeMode == 2) {",
    "      float mainAngle = tAlong * uShapeTurns * 6.28318530718;",
    "      float cxp = shapeR * cos(mainAngle);",
    "      float cyp = shapeR * sin(mainAngle);",
    "      float czp = (tAlong - 0.5) * uShapeHeight;",
    "      float strandAngle = ringN * 6.28318530718 + tAlong * uShapeTwist * 6.28318530718;",
    "      Xt = cxp + uShapeRadius2 * cos(strandAngle) * cos(mainAngle);",
    "      Yt = cyp + uShapeRadius2 * cos(strandAngle) * sin(mainAngle);",
    "      Zt = czp + uShapeRadius2 * sin(strandAngle);",
    "    } else if (uShapeMode == 3) {",
    "      float angle = tAlong * 6.28318530718;",
    "      float bandAngle = angle * 0.5 * uShapeTwist;",
    "      float w = (ringN - 0.5) * 2.0 * uShapeRadius2;",
    "      float radialX = cos(angle), radialY = sin(angle);",
    "      Xt = shapeR * radialX + w * cos(bandAngle) * radialX;",
    "      Yt = shapeR * radialY + w * cos(bandAngle) * radialY;",
    "      Zt = w * sin(bandAngle);",
    "    } else if (uShapeMode == 4) {",
    "      float cxr = aDir.x, cyr = aDir.y;",
    "      float m = max(abs(cxr), abs(cyr));",
    "      if (m < 0.0001) m = 0.0001;",
    "      Xt = (cxr / m) * shapeR;",
    "      Yt = (cyr / m) * shapeR;",
    "      Zt = (ringN - 0.5) * uShapeHeight;",
    "    } else if (uShapeMode == 5) {",
    "      float angle8 = tAlong * 6.28318530718;",
    "      float ca8 = cos(angle8), sa8 = sin(angle8);",
    "      float cx8 = shapeR * ca8;",
    "      float cy8 = shapeR * sa8 * ca8;",
    "      vec2 tan8 = vec2(-sa8, cos(2.0 * angle8));",
    "      float tlen8 = length(tan8);",
    "      if (tlen8 < 0.0001) tlen8 = 0.0001;",
    "      tan8 /= tlen8;",
    "      vec2 nrm8 = vec2(-tan8.y, tan8.x);",
    "      float bandAngle8 = angle8 * 0.5;",
    "      float w8 = (ringN - 0.5) * 2.0 * uShapeRadius2;",
    "      Xt = cx8 + w8 * cos(bandAngle8) * nrm8.x;",
    "      Yt = cy8 + w8 * cos(bandAngle8) * nrm8.y;",
    "      Zt = w8 * sin(bandAngle8);",
    "    } else if (uShapeMode == 6) {",
    "      float tk = tAlong * 6.28318530718;",
    "      float mainAngle = tk * uShapeTurns;",
    "      float tubeAngle = tk * uShapeTwist;",
    "      float ctb = cos(tubeAngle), stb = sin(tubeAngle);",
    "      float cma = cos(mainAngle), sma = sin(mainAngle);",
    "      float coreX = (shapeR + uShapeRadius2 * ctb) * cma;",
    "      float coreY = (shapeR + uShapeRadius2 * ctb) * sma;",
    "      float coreZ = uShapeRadius2 * stb;",
    "      vec3 knotDir = vec3(ctb * cma, ctb * sma, stb);",
    "      float wk = (ringN - 0.5) * 2.0 * uShapeRadius2 * 0.75;",
    "      Xt = coreX + wk * knotDir.x;",
    "      Yt = coreY + wk * knotDir.y;",
    "      Zt = coreZ + wk * knotDir.z;",
    "    } else {",
    "      float tw = tAlong - 0.5;",
    "      float xAlong = tw * uShapeHeight;",
    "      float phase = tAlong * uShapeTurns * 6.28318530718;",
    "      float yWave = shapeR * sin(phase);",
    "      float dyWave = shapeR * uShapeTurns * 6.28318530718 * cos(phase);",
    "      vec2 tanW = vec2(uShapeHeight, dyWave);",
    "      float tlenW = length(tanW);",
    "      if (tlenW < 0.0001) tlenW = 0.0001;",
    "      tanW /= tlenW;",
    "      vec2 nrmW = vec2(-tanW.y, tanW.x);",
    "      float bandAngleW = tAlong * uShapeTwist * 3.14159265;",
    "      float wW = (ringN - 0.5) * 2.0 * uShapeRadius2;",
    "      Xt = xAlong + wW * cos(bandAngleW) * nrmW.x;",
    "      Yt = yWave + wW * cos(bandAngleW) * nrmW.y;",
    "      Zt = wW * sin(bandAngleW);",
    "    }",
    "    animated = mix(animated, vec2(Xt, Yt), uShapeMorph);",
    "    smoothPos = mix(smoothPos, vec2(Xt, Yt), uShapeMorph);",
    "    shapeZ = mix(existingZ, Zt * uShapeScale, uShapeMorph);",
    "  }",
    "  float d = distance(smoothPos, uAnchorLocal);",
    "  float influence = exp(-(d*d) / (2.0 * uDeformRadius * uDeformRadius + 0.001));",
    "  vec2 rel = smoothPos - uAnchorLocal;",
    "  float rlen = length(rel);",
    "  vec2 rdir = rlen > 0.0001 ? rel / rlen : vec2(0.0, 1.0);",
    "  if (uDeformType == 1) {",
    "    animated -= rdir * uDeformStrength * influence;",
    "  } else if (uDeformType == 2) {",
    "    float ang = uDeformStrength * influence * 0.02;",
    "    float ca = cos(ang), sa = sin(ang);",
    "    vec2 relAnimated = animated - uAnchorLocal;",
    "    animated = uAnchorLocal + vec2(relAnimated.x*ca - relAnimated.y*sa, relAnimated.x*sa + relAnimated.y*ca);",
    "  } else {",
    "    animated += rdir * uDeformStrength * influence;",
    "  }",
    "  float cxr3 = cos(uRot3DX), sxr3 = sin(uRot3DX);",
    "  float ny3 = animated.y * cxr3 - shapeZ * sxr3;",
    "  float nz3 = animated.y * sxr3 + shapeZ * cxr3;",
    "  animated.y = ny3; shapeZ = nz3;",
    "  float cyr3 = cos(uRot3DY), syr3 = sin(uRot3DY);",
    "  float nx3 = animated.x * cyr3 + shapeZ * syr3;",
    "  nz3 = -animated.x * syr3 + shapeZ * cyr3;",
    "  animated.x = nx3; shapeZ = nz3;",
    "  vec3 pos = uTransform * vec3(animated, 1.0);",
    "  vec2 nrm = uRotMat * aNormal;",
    "  float len = length(nrm);",
    "  if (len > 0.00001) nrm /= len;",
    "  vec2 extruded = pos.xy + nrm * aSide * (uLineWidthPx * ringWidthMod * 0.5);",
    "  float z = shapeZ;",
    "  vec2 rel3 = extruded - uCenterPx;",
    "  float ry = rel3.y * uTiltXTrig.x - z * uTiltXTrig.y;",
    "  float rz = rel3.y * uTiltXTrig.y + z * uTiltXTrig.x;",
    "  float rx = rel3.x * uTiltYTrig.x + rz * uTiltYTrig.y;",
    "  rz = -rel3.x * uTiltYTrig.y + rz * uTiltYTrig.x;",
    "  float denom = max(uFocal - rz, uFocal * 0.2);",
    "  float persp = uFocal / denom;",
    "  vec2 finalXY = uCenterPx + vec2(rx, ry) * persp;",
    "  vec2 zeroToOne = finalXY / uResolution;",
    "  vec2 clip = zeroToOne * 2.0 - 1.0;",
    "  clip.y = -clip.y;",
    "  gl_Position = vec4(clip, 0.0, 1.0);",
    "  vEdge = aSide;",
    "}"
  ].join("\n");

  var FRAG_SRC = [
    "precision mediump float;",
    "uniform vec4 uColor;",
    "varying float vEdge;",
    "varying float vGrowth;",
    "varying float vRingOpacity;",
    "void main(){",
    "  float d = abs(vEdge);",
    "  float alpha = 1.0 - smoothstep(0.55, 1.0, d);",
    "  gl_FragColor = vec4(uColor.rgb, uColor.a * alpha * vGrowth * vRingOpacity);",
    "}"
  ].join("\n");

  function compile(type, src){
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)){
      console.error(gl.getShaderInfoLog(sh));
    }
    return sh;
  }
  var prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT_SRC));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG_SRC));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)){
    console.error(gl.getProgramInfoLog(prog));
  }
  gl.useProgram(prog);

  var locPos = gl.getAttribLocation(prog, 'aRadial');
  var locDir = gl.getAttribLocation(prog, 'aDir');
  var locRing = gl.getAttribLocation(prog, 'aRing');
  var locU = gl.getAttribLocation(prog, 'aU');
  var locNormal = gl.getAttribLocation(prog, 'aNormal');
  var locSide = gl.getAttribLocation(prog, 'aSide');
  var locTransform = gl.getUniformLocation(prog, 'uTransform');
  var locRotMat = gl.getUniformLocation(prog, 'uRotMat');
  var locResolution = gl.getUniformLocation(prog, 'uResolution');
  var locLineWidth = gl.getUniformLocation(prog, 'uLineWidthPx');
  var locColor = gl.getUniformLocation(prog, 'uColor');
  var locTime = gl.getUniformLocation(prog, 'uTime');
  var locIrregAmt = gl.getUniformLocation(prog, 'uIrregAmt');
  var locIrregFreq = gl.getUniformLocation(prog, 'uIrregFreq');
  var locWobbleSpeed = gl.getUniformLocation(prog, 'uWobbleSpeed');
  var locSeedOffset = gl.getUniformLocation(prog, 'uSeedOffset');
  var locAnchorLocal = gl.getUniformLocation(prog, 'uAnchorLocal');
  var locDeformStrength = gl.getUniformLocation(prog, 'uDeformStrength');
  var locDeformRadius = gl.getUniformLocation(prog, 'uDeformRadius');
  var locDeformType = gl.getUniformLocation(prog, 'uDeformType');
  var locCenterPx = gl.getUniformLocation(prog, 'uCenterPx');
  var locTiltXTrig = gl.getUniformLocation(prog, 'uTiltXTrig');
  var locTiltYTrig = gl.getUniformLocation(prog, 'uTiltYTrig');
  var locFocal = gl.getUniformLocation(prog, 'uFocal');
  var locSpiralZ = gl.getUniformLocation(prog, 'uSpiralZ');
  var locDepthOffset = gl.getUniformLocation(prog, 'uDepthOffset');
  var locRingCountInv = gl.getUniformLocation(prog, 'uRingCountInv');
  var locBaseRadius = gl.getUniformLocation(prog, 'uBaseRadius');
  var locSpacing = gl.getUniformLocation(prog, 'uSpacing');
  var locSpacingVarAmt = gl.getUniformLocation(prog, 'uSpacingVarAmt');
  var locEccentricity = gl.getUniformLocation(prog, 'uEccentricity');
  var locEccDenomInv = gl.getUniformLocation(prog, 'uEccDenomInv');
  var locEccDir = gl.getUniformLocation(prog, 'uEccDir');
  var locBulgeAmt = gl.getUniformLocation(prog, 'uBulgeAmt');
  var locTwistPerRing = gl.getUniformLocation(prog, 'uTwistPerRing');
  var locMobiusAmt = gl.getUniformLocation(prog, 'uMobiusAmt');
  var locMobiusFreq = gl.getUniformLocation(prog, 'uMobiusFreq');
  var locMobiusRingTwist = gl.getUniformLocation(prog, 'uMobiusRingTwist');
  var locGrowthSpeed = gl.getUniformLocation(prog, 'uGrowthSpeed');
  var locGrowthWaveCount = gl.getUniformLocation(prog, 'uGrowthWaveCount');
  var locGrowthAmt = gl.getUniformLocation(prog, 'uGrowthAmt');
  var locShapeMode = gl.getUniformLocation(prog, 'uShapeMode');
  var locShapeMorph = gl.getUniformLocation(prog, 'uShapeMorph');
  var locShapeRadius = gl.getUniformLocation(prog, 'uShapeRadius');
  var locShapeRadius2 = gl.getUniformLocation(prog, 'uShapeRadius2');
  var locShapeTurns = gl.getUniformLocation(prog, 'uShapeTurns');
  var locShapeHeight = gl.getUniformLocation(prog, 'uShapeHeight');
  var locShapeTwist = gl.getUniformLocation(prog, 'uShapeTwist');
  var locShapeScale = gl.getUniformLocation(prog, 'uShapeScale');
  var locRippleAmt = gl.getUniformLocation(prog, 'uRippleAmt');
  var locRippleFreq = gl.getUniformLocation(prog, 'uRippleFreq');
  var locRippleSpeed = gl.getUniformLocation(prog, 'uRippleSpeed');
  var locTwistSpeed = gl.getUniformLocation(prog, 'uTwistSpeed');
  var locRingWidthVar = gl.getUniformLocation(prog, 'uRingWidthVar');
  var locRingOpacityVar = gl.getUniformLocation(prog, 'uRingOpacityVar');
  var locRingWobbleVar = gl.getUniformLocation(prog, 'uRingWobbleVar');
  var locRingDrift = gl.getUniformLocation(prog, 'uRingDrift');
  var locRot3DX = gl.getUniformLocation(prog, 'uRot3DX');
  var locRot3DY = gl.getUniformLocation(prog, 'uRot3DY');

  gl.enable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);

  // ---------------------------------------------------------------
  // Offscreen compositing: a translucent stroke is built from many
  // overlapping triangles (segment quads + round joint fans). Blending
  // them straight onto the canvas double-darkens every joint where they
  // overlap. Instead each layer is first rendered into its own texture
  // with MAX blending (which resolves the overlaps into a clean coverage
  // mask, since the color is constant across a layer), then that texture
  // is composited onto the canvas exactly once with the layer's real
  // blend mode/opacity — eliminating the beaded/dashed seam artifact.
  var extMax = gl.getExtension('EXT_blend_minmax');
  var MAX_EQ = extMax ? extMax.MAX_EXT : gl.FUNC_ADD;

  var fbo = gl.createFramebuffer();
  var fboTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, fboTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  var fboW = 0, fboH = 0;
  function ensureFBO(w, h){
    if (fboW === w && fboH === h) return;
    fboW = w; fboH = h;
    gl.bindTexture(gl.TEXTURE_2D, fboTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  var BLIT_VERT_SRC = [
    "attribute vec2 aQuadPos;",
    "varying vec2 vUv;",
    "void main(){",
    "  vUv = aQuadPos * 0.5 + 0.5;",
    "  gl_Position = vec4(aQuadPos, 0.0, 1.0);",
    "}"
  ].join("\n");
  var BLIT_FRAG_SRC = [
    "precision mediump float;",
    "uniform sampler2D uTex;",
    "varying vec2 vUv;",
    "void main(){",
    "  gl_FragColor = texture2D(uTex, vUv);",
    "}"
  ].join("\n");
  var blitProg = gl.createProgram();
  gl.attachShader(blitProg, compile(gl.VERTEX_SHADER, BLIT_VERT_SRC));
  gl.attachShader(blitProg, compile(gl.FRAGMENT_SHADER, BLIT_FRAG_SRC));
  gl.linkProgram(blitProg);
  if (!gl.getProgramParameter(blitProg, gl.LINK_STATUS)){
    console.error(gl.getProgramInfoLog(blitProg));
  }
  var locQuadPos = gl.getAttribLocation(blitProg, 'aQuadPos');
  var locBlitTex = gl.getUniformLocation(blitProg, 'uTex');
  var quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

  var STRIDE = 36; // 9 floats * 4 bytes

  function setupAttribs(){
    gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, STRIDE, 0);
    gl.vertexAttribPointer(locDir, 2, gl.FLOAT, false, STRIDE, 8);
    gl.vertexAttribPointer(locRing, 1, gl.FLOAT, false, STRIDE, 16);
    gl.vertexAttribPointer(locU, 1, gl.FLOAT, false, STRIDE, 20);
    gl.vertexAttribPointer(locNormal, 2, gl.FLOAT, false, STRIDE, 24);
    gl.vertexAttribPointer(locSide, 1, gl.FLOAT, false, STRIDE, 32);
    gl.enableVertexAttribArray(locPos);
    gl.enableVertexAttribArray(locDir);
    gl.enableVertexAttribArray(locRing);
    gl.enableVertexAttribArray(locU);
    gl.enableVertexAttribArray(locNormal);
    gl.enableVertexAttribArray(locSide);
  }

  var BLEND_MODES = {
    normal:   [gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA],
    multiply: [gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA],
    screen:   [gl.ONE, gl.ONE_MINUS_SRC_COLOR],
    add:      [gl.SRC_ALPHA, gl.ONE]
  };

  var state = normalizeConfig(config);
  var _scenes = [{ layers: state.layers, alpha: 1 }];
  var _running = true, _raf = 0, _tr = null;

  var geomCache = {}; // layer.id -> {buf, vbo, count}

  function regenLayerGeometry(layer){
    var buf = buildRingGeometry(layer);
    var entry = geomCache[layer.id];
    if (!entry){
      entry = { vbo: gl.createBuffer() };
      geomCache[layer.id] = entry;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, entry.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, buf, gl.DYNAMIC_DRAW);
    entry.count = buf.length / 9;
  }

  function regenAll(){
    state.layers.forEach(regenLayerGeometry);
    updateStats();
  }

  function updateStats(){
    var totalRings = 0, totalVerts = 0;
    state.layers.forEach(function(l){
      if (!l.enabled) return;
      totalRings += l.ringCount;
      var e = geomCache[l.id];
      if (e) totalVerts += e.count;
    });
    if (onStats) onStats({
      layers: state.layers.filter(function(l){ return l.enabled; }).length,
      rings: totalRings,
      verts: totalVerts
    });
  }
  // ---------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------
  function hexToRgb(hex){
    var v = parseInt(hex.replace('#',''), 16);
    return [((v>>16)&255)/255, ((v>>8)&255)/255, (v&255)/255];
  }

  var mouseClientX = 0, mouseClientY = 0, hasMouse = false;
  function onMouseMove(e){
    mouseClientX = e.clientX; mouseClientY = e.clientY; hasMouse = true;
  }
  window.addEventListener('mousemove', onMouseMove);

  var startTime = performance.now();
  var lastFrameMs = startTime;   // for the damped ambient clock, see render()
  var animTime = 0;              // idle-motion clock, advances at `ambient` rate
  var ambient = 1;               // 1 = full idle motion, dips while transitioning

  function resize(){
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth, h = canvas.clientHeight;
    var W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (canvas.width !== W || canvas.height !== H){
      canvas.width = W; canvas.height = H;
    }
    return dpr;
  }

  function render(){
    _stepTransition();
    var dpr = resize();
    if (canvas.width <= 0 || canvas.height <= 0){
      if (_running) _raf = requestAnimationFrame(render);
      return;
    }
    ensureFBO(canvas.width, canvas.height);
    gl.useProgram(prog);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    var bg = hexToRgb(state.bgColor);
    gl.clearColor(bg[0], bg[1], bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform2f(locResolution, canvas.width, canvas.height);

    // The idle motion (tilt sway, layer spin, breathing, wobble, growth and
    // ripple waves) runs off its own clock rather than raw elapsed time, so it
    // can be slowed right down while a transition plays. Without this the
    // morph competes with every ambient animation at once and reads as busy.
    // Advancing the clock more slowly — rather than scaling amplitudes — keeps
    // every phase continuous, so nothing jumps when the damping comes and goes.
    var nowMs = performance.now();
    var dt = Math.min(0.05, (nowMs - lastFrameMs) / 1000);
    lastFrameMs = nowMs;
    var ambientTarget = _tr ? _tr.calm : 1;
    ambient += (ambientTarget - ambient) * Math.min(1, dt * 5);
    animTime += dt * ambient;

    var elapsed = animTime;
    var cxPx = canvas.width / 2, cyPx = canvas.height / 2;

    var rect = canvas.getBoundingClientRect();
    var mouseNX = 0, mouseNY = 0, mouseWorldX, mouseWorldY;
    if (hasMouse && rect.width > 0 && rect.height > 0){
      mouseNX = ((mouseClientX - rect.left) / rect.width) * 2 - 1;
      mouseNY = ((mouseClientY - rect.top) / rect.height) * 2 - 1;
      mouseWorldX = (mouseClientX - rect.left) * dpr;
      mouseWorldY = (mouseClientY - rect.top) * dpr;
    } else {
      mouseWorldX = -canvas.width * 4; mouseWorldY = -canvas.height * 4;
    }

    // sway back and forth rather than spin unbounded, so the piece keeps moving
    // without ever rotating edge-on (where a flat ring plane collapses to a line)
    var tiltYNow = state.tiltY + (state.autoTilt ? Math.sin(elapsed * state.tiltSpeed * 0.15) * 22 : 0);
    var txRad = state.tiltX * Math.PI / 180, tyRad = tiltYNow * Math.PI / 180;
    gl.uniform2f(locCenterPx, cxPx, cyPx);
    gl.uniform2f(locTiltXTrig, Math.cos(txRad), Math.sin(txRad));
    gl.uniform2f(locTiltYTrig, Math.cos(tyRad), Math.sin(tyRad));
    // map the 0..80 "perspective strength" slider to a focal length: 0 = huge
    // focal (near-orthographic), 80 = focal close to the canvas size (strong,
    // but always positive and bounded so it can never invert/explode)
    var perspNorm = Math.min(1, state.perspective / 80);
    var maxDim = Math.max(canvas.width, canvas.height);
    var focal = perspNorm < 0.001 ? 1e7 : maxDim * (2.6 - perspNorm * 1.9);
    gl.uniform1f(locFocal, focal);

    var DEFORM_TYPES = { push: 0, pull: 1, swirl: 2 };
    var SHAPE_MODES = { none: 0, sphere: 1, helix: 2, mobius: 3, cube: 4, infinity: 5, torusknot: 6, wave: 7 };

    _scenes.forEach(function(scene){
    var sceneAlpha = scene.alpha;
    scene.layers.forEach(function(layer, idx){
      if (!layer.enabled) return;
      var entry = geomCache[layer.id];
      if (!entry || !entry.count) return;

      gl.useProgram(prog);

      var angleDeg = layer.rotation + (state.autoRotate ? layer.rotateSpeed * elapsed * 6 : 0);
      var angle = angleDeg * Math.PI / 180;
      var breathPhase = (layer.seed % 97) * 0.0647;
      var breathe = 1 + layer.breatheAmp * Math.sin(elapsed * layer.breatheSpeed + breathPhase);
      var s = layer.scale * state.globalScale * dpr * breathe;
      var cos = Math.cos(angle), sin = Math.sin(angle);

      var parX = 0, parY = 0;
      if (state.mouseReact){
        var depth = 1 + idx * 0.35;
        parX = mouseNX * state.mouseStrength * depth;
        parY = mouseNY * state.mouseStrength * depth;
      }
      var tx = cxPx + (layer.offsetX + parX) * dpr;
      var ty = cyPx + (layer.offsetY + parY) * dpr;

      var transform = [
        s*cos, s*sin, 0,
        -s*sin, s*cos, 0,
        tx, ty, 1
      ];
      var rotMat = [cos, sin, -sin, cos];

      // resolve the deform anchor into this layer's local (pre-transform) design
      // space: either the live mouse position, or a fixed user-placed point
      var lx, ly;
      if (layer.deformMode === 'fixed'){
        lx = layer.anchorX; ly = layer.anchorY;
      } else {
        var dxm = mouseWorldX - tx, dym = mouseWorldY - ty;
        var invS = s || 1e-6;
        lx = (dxm*cos + dym*sin) / invS;
        ly = (-dxm*sin + dym*cos) / invS;
      }

      gl.uniformMatrix3fv(locTransform, false, transform);
      gl.uniformMatrix2fv(locRotMat, false, rotMat);
      gl.uniform1f(locLineWidth, Math.max(0.1, layer.lineWidth) * dpr);
      var rgb = hexToRgb(layer.color);
      gl.uniform4f(locColor, rgb[0], rgb[1], rgb[2], layer.opacity * sceneAlpha);
      gl.uniform1f(locTime, elapsed);
      gl.uniform1f(locIrregAmt, layer.irregAmt);
      gl.uniform1f(locIrregFreq, layer.irregFreq);
      gl.uniform1f(locWobbleSpeed, layer.wobbleSpeed);
      gl.uniform2f(locSeedOffset, layer.seed * 0.173, layer.seed * 0.911);
      gl.uniform2f(locAnchorLocal, lx, ly);
      gl.uniform1f(locDeformStrength, (state.mouseDeform || layer.deformMode === 'fixed') ? layer.deformStrength : 0);
      gl.uniform1f(locDeformRadius, Math.max(1, layer.deformRadius));
      gl.uniform1i(locDeformType, DEFORM_TYPES[layer.deformType] || 0);
      gl.uniform1f(locSpiralZ, layer.spiralZ * s);
      gl.uniform1f(locDepthOffset, layer.depthOffset * dpr);
      gl.uniform1f(locRingCountInv, 1 / Math.max(1, layer.ringCount - 1));
      gl.uniform1f(locBaseRadius, layer.baseRadius);
      gl.uniform1f(locSpacing, layer.spacing);
      gl.uniform1f(locSpacingVarAmt, layer.spacingVarAmt);
      gl.uniform1f(locEccentricity, layer.eccentricity);
      gl.uniform1f(locEccDenomInv, 1 / Math.max(1, layer.ringCount - 1));
      var eccRad = (layer.eccentricityAngle || 0) * Math.PI / 180;
      gl.uniform2f(locEccDir, Math.cos(eccRad), Math.sin(eccRad));
      gl.uniform1f(locBulgeAmt, layer.bulgeAmt);
      gl.uniform1f(locTwistPerRing, (layer.twistPerRing || 0) * Math.PI / 180);
      gl.uniform1f(locMobiusAmt, (layer.mobiusAmt || 0) * s);
      gl.uniform1f(locMobiusFreq, layer.mobiusFreq || 0);
      gl.uniform1f(locMobiusRingTwist, (layer.mobiusRingTwist || 0) * Math.PI / 180);
      gl.uniform1f(locGrowthSpeed, layer.growthSpeed || 0);
      gl.uniform1f(locGrowthWaveCount, Math.max(0.01, layer.growthWaveCount || 0.01));
      gl.uniform1f(locGrowthAmt, Math.min(1, Math.max(0, layer.growthAmt || 0)));
      gl.uniform1i(locShapeMode, SHAPE_MODES[layer.shapeMode] || 0);
      gl.uniform1f(locShapeMorph, Math.min(1, Math.max(0, layer.shapeMorph || 0)));
      gl.uniform1f(locShapeRadius, layer.shapeRadius || 0);
      gl.uniform1f(locShapeRadius2, layer.shapeRadius2 || 0);
      gl.uniform1f(locShapeTurns, layer.shapeTurns || 0);
      gl.uniform1f(locShapeHeight, layer.shapeHeight || 0);
      gl.uniform1f(locShapeTwist, layer.shapeTwist || 0);
      gl.uniform1f(locShapeScale, s);
      gl.uniform1f(locRippleAmt, layer.rippleAmt || 0);
      gl.uniform1f(locRippleFreq, layer.rippleFreq || 0);
      gl.uniform1f(locRippleSpeed, layer.rippleSpeed || 0);
      gl.uniform1f(locTwistSpeed, (layer.twistSpeed || 0) * Math.PI / 180);
      gl.uniform1f(locRingWidthVar, layer.ringWidthVar || 0);
      gl.uniform1f(locRingOpacityVar, layer.ringOpacityVar || 0);
      gl.uniform1f(locRingWobbleVar, layer.ringWobbleVar || 0);
      gl.uniform1f(locRingDrift, layer.ringDrift || 0);
      gl.uniform1f(locRot3DX, (layer.rot3DX || 0) * Math.PI / 180);
      gl.uniform1f(locRot3DY, (layer.rot3DY || 0) * Math.PI / 180);

      // Pass 1: draw this layer's segment quads + round joints into an
      // offscreen texture with MAX blending. Color is constant across the
      // layer, so taking the max alpha at every overlap resolves the
      // segment/joint double-coverage into a single clean coverage mask.
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.blendEquation(MAX_EQ);
      gl.bindBuffer(gl.ARRAY_BUFFER, entry.vbo);
      setupAttribs();
      gl.drawArrays(gl.TRIANGLES, 0, entry.count);

      // Pass 2: composite the resolved layer texture onto the canvas once,
      // using this layer's actual blend mode (opacity is already baked
      // into the texture's alpha from uColor.a in pass 1).
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.blendEquation(gl.FUNC_ADD);
      var bm = BLEND_MODES[layer.blend] || BLEND_MODES.normal;
      gl.blendFunc(bm[0], bm[1]);
      gl.useProgram(blitProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.vertexAttribPointer(locQuadPos, 2, gl.FLOAT, false, 8, 0);
      gl.enableVertexAttribArray(locQuadPos);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fboTex);
      gl.uniform1i(locBlitTex, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
    });

    if (_running) _raf = requestAnimationFrame(render);
  }

  // ---------------------------------------------------------------
  // Transitions
  // ---------------------------------------------------------------
  function _freeLayerGeometry(layers) {
    layers.forEach(function (l) {
      var e = geomCache[l.id];
      if (e) { gl.deleteBuffer(e.vbo); delete geomCache[l.id]; }
    });
  }

  function _finishTransition() {
    if (!_tr) return;
    var tr = _tr;
    _tr = null;
    if (tr.mode === 'morph') {
      tr.pairs.forEach(function (p) {
        LAYER_NUM_KEYS.forEach(function (k) { p.live[k] = p.to[k]; });
        LAYER_COLOR_KEYS.forEach(function (k) { p.live[k] = p.to[k]; });
        LAYER_DISCRETE_KEYS.forEach(function (k) {
          if (k !== 'id') p.live[k] = p.to[k];
        });
      });
    } else {
      // both 'crossfade' and 'forced' land on the real target layers
      if (!tr.blending && tr.mode === 'forced') {
        tr.incoming.forEach(function (l) { regenLayerGeometry(l); });
      }
      _freeLayerGeometry(state.layers);
      state.layers = tr.incoming;
      _scenes = [{ layers: state.layers, alpha: 1 }];
    }
    CAM_NUM_KEYS.forEach(function (k) { state[k] = tr.toCam[k]; });
    CAM_COLOR_KEYS.forEach(function (k) { state[k] = tr.toCam[k]; });
    CAM_BOOL_KEYS.forEach(function (k) { state[k] = tr.toCam[k]; });
    updateStats();
    if (tr.onComplete) tr.onComplete();
  }

  function _stepTransition() {
    if (!_tr) return;
    var t = _tr.duration <= 0 ? 1 : Math.min(1, (performance.now() - _tr.start) / _tr.duration);
    var e = _tr.ease(t);

    CAM_NUM_KEYS.forEach(function (k) {
      state[k] = _tr.fromCam[k] + (_tr.toCam[k] - _tr.fromCam[k]) * e;
    });
    CAM_COLOR_KEYS.forEach(function (k) {
      state[k] = mixHex(_tr.fromCam[k], _tr.toCam[k], e);
    });
    if (e >= 0.5) CAM_BOOL_KEYS.forEach(function (k) { state[k] = _tr.toCam[k]; });

    if (_tr.mode === 'morph') {
      _morphPairs(_tr.pairs, e);
    } else if (_tr.mode === 'forced') {
      // Morph as far as the shared parameters allow, then hand over to the
      // real target with a short crossfade. By the handover both sides agree
      // on colour, radius, spacing, eccentricity and shape — only the baked
      // ring structure still differs — so the swap is hard to see.
      _morphPairs(_tr.pairs, _tr.ease(Math.min(1, t / _tr.split)));
      if (t > _tr.split) {
        if (!_tr.blending) {
          _tr.blending = true;
          _tr.incoming.forEach(function (l) { regenLayerGeometry(l); });
          _scenes = [
            { layers: state.layers, alpha: 1 },
            { layers: _tr.incoming, alpha: 0 }
          ];
        }
        var bt = (t - _tr.split) / (1 - _tr.split);
        _scenes[0].alpha = 1 - bt;
        _scenes[1].alpha = bt;
      }
    } else {
      _scenes[0].alpha = 1 - e;
      _scenes[1].alpha = e;
    }

    if (t >= 1) _finishTransition();
  }

  function _morphPairs(pairs, e) {
    pairs.forEach(function (p) {
      var swapsShape = p.from.shapeMode !== p.to.shapeMode;
      LAYER_NUM_KEYS.forEach(function (k) {
        if (swapsShape && k === 'shapeMorph') return;
        p.live[k] = p.from[k] + (p.to[k] - p.from[k]) * e;
      });
      // A shape-mode change cannot be interpolated, so unfold back toward
      // the plain ring form first, swap, then fold into the new shape. Each
      // half is eased so the fold settles to a stop at the midpoint instead
      // of reversing direction at full speed.
      if (swapsShape) {
        if (e < 0.5) {
          p.live.shapeMode = p.from.shapeMode;
          p.live.shapeMorph = p.from.shapeMorph * (1 - EASINGS.easeInOutQuad(e * 2));
        } else {
          p.live.shapeMode = p.to.shapeMode;
          p.live.shapeMorph = p.to.shapeMorph * EASINGS.easeInOutQuad((e - 0.5) * 2);
        }
      }
      LAYER_COLOR_KEYS.forEach(function (k) { p.live[k] = mixHex(p.from[k], p.to[k], e); });
      if (e >= 0.5) {
        LAYER_DISCRETE_KEYS.forEach(function (k) {
          if (k === 'id' || (swapsShape && k === 'shapeMode')) return;
          p.live[k] = p.to[k];
        });
      }
    });
  }

  function cancelTransition() {
    if (!_tr) return;
    if (_tr.incoming) _freeLayerGeometry(_tr.incoming);
    _tr = null;
    _scenes = [{ layers: state.layers, alpha: 1 }];
  }


  // Animates from the current look to `target`. Structural parameters decide
  // automatically whether this is a true morph or a crossfade; the camera is
  // always numerically interpolated so the viewpoint never jumps.
  function transitionTo(target, o) {
    o = o || {};
    cancelTransition();
    var to = normalizeConfig(target);
    var duration = o.duration === undefined ? 1200 : o.duration;
    var ease = typeof o.easing === 'function' ? o.easing : (EASINGS[o.easing] || EASINGS.easeInOutCubic);

    var fromCam = {}, toCam = {};
    CAM_NUM_KEYS.concat(CAM_COLOR_KEYS, CAM_BOOL_KEYS).forEach(function (k) {
      fromCam[k] = state[k]; toCam[k] = to[k];
    });

    var mode = canMorph(state, to) ? 'morph' : 'crossfade';
    if (mode === 'crossfade' && o.force) mode = 'forced';

    var tr = {
      mode: mode, start: performance.now(), duration: duration, ease: ease,
      fromCam: fromCam, toCam: toCam, onComplete: o.onComplete || null,
      // how much idle motion to leave running underneath: 1 keeps the piece
      // fully alive (busy), 0 freezes it so only the morph moves
      calm: o.calm === undefined ? defaultCalm : Math.max(0, Math.min(1, o.calm))
    };

    if (mode === 'morph') {
      tr.pairs = state.layers.map(function (live, i) {
        return { live: live, from: Object.assign({}, live), to: to.layers[i] };
      });
    } else if (mode === 'forced') {
      tr.split = o.split === undefined ? 0.82 : o.split;
      tr.incoming = to.layers;
      // Pad the live list so every target layer has a partner to morph into.
      // Added slots start invisible and fade in; live layers the target has no
      // counterpart for fade out — so a change in layer count is absorbed by
      // opacity rather than popping at t=0.
      while (state.layers.length < to.layers.length) {
        var src = state.layers[state.layers.length - 1] || defaultLayer();
        var clone = defaultLayer(Object.assign({}, src));
        clone.id = 'L' + (Math.random() * 1e6 | 0);
        clone.opacity = 0;
        regenLayerGeometry(clone);
        state.layers.push(clone);
      }
      _scenes = [{ layers: state.layers, alpha: 1 }];
      tr.pairs = state.layers.map(function (live, i) {
        var tgt = to.layers[i] || Object.assign({}, live, { opacity: 0 });
        return { live: live, from: Object.assign({}, live), to: tgt };
      });
    } else {
      tr.incoming = to.layers;
      tr.incoming.forEach(function (l) { regenLayerGeometry(l); });
      _scenes = [
        { layers: state.layers, alpha: 1 },
        { layers: tr.incoming, alpha: 0 }
      ];
    }
    _tr = tr;
    if (duration <= 0) _finishTransition();
    return mode;
  }

  // Instant swap, no animation.
  function setConfig(cfg) {
    cancelTransition();
    var n = normalizeConfig(cfg);
    var old = state.layers;
    Object.keys(n).forEach(function (k) { state[k] = n[k]; });
    _freeLayerGeometry(old.filter(function (l) {
      return state.layers.indexOf(l) < 0;
    }));
    _scenes = [{ layers: state.layers, alpha: 1 }];
    regenAll();
  }

  function destroy() {
    _running = false;
    if (_raf) cancelAnimationFrame(_raf);
    window.removeEventListener('mousemove', onMouseMove);
    _freeLayerGeometry(state.layers);
    if (_tr && _tr.mode === 'crossfade') _freeLayerGeometry(_tr.incoming);
  }

  regenAll();
  _raf = requestAnimationFrame(render);

  return {
    canvas: canvas,
    state: state,
    getConfig: function () { return cloneConfig(state); },
    setConfig: setConfig,
    transitionTo: transitionTo,
    cancelTransition: cancelTransition,
    isTransitioning: function () { return !!_tr; },
    regenLayer: regenLayerGeometry,
    regenAll: regenAll,
    updateStats: updateStats,
    // Swap the layer list while keeping the current camera (authoring helper).
    setLayers: function (list) {
      cancelTransition();
      _freeLayerGeometry(state.layers.filter(function (l) { return list.indexOf(l) < 0; }));
      state.layers = list;
      _scenes = [{ layers: state.layers, alpha: 1 }];
      regenAll();
    },
    releaseLayer: function (layer) { _freeLayerGeometry([layer]); },
    // Draw one frame synchronously — needed before canvas.toDataURL().
    // _running is cleared so this extra draw does not queue a second rAF loop.
    renderNow: function () {
      var wasRunning = _running;
      _running = false;
      render();
      _running = wasRunning;
    },
    destroy: destroy
  };
  }

  global.NenrinArt = {
    version: '1.0.0',
    create: create,
    defaultLayer: defaultLayer,
    defaultConfig: defaultConfig,
    normalizeConfig: normalizeConfig,
    cloneConfig: cloneConfig,
    canMorph: canMorph,
    easings: EASINGS,
    STRUCTURAL_KEYS: STRUCTURAL_KEYS,
    LAYER_NUM_KEYS: LAYER_NUM_KEYS
  };
})(typeof window !== 'undefined' ? window : this);
