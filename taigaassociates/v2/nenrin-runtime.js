/*!
 * nenrin-runtime.js v2 — TAIGA ASSOCIATES 年輪ラインアート ランタイム
 *
 * 年輪を平面のグラフィックとして描くエンジン。オーサリングは
 * nenrin-lineart-tester.html で行い、書き出された設定オブジェクトを
 * このランタイムに渡して描画します。
 *
 *   <canvas id="art" style="width:100%;height:100%"></canvas>
 *   <script src="nenrin-runtime.js"></script>
 *   <script>
 *     var art = NenrinArt.create(document.getElementById('art'), MY_CONFIG_A);
 *     art.transitionTo(MY_CONFIG_B, { duration: 1400 });
 *   </script>
 *
 * v1 からの変更: 設定は1枚のアートを表すフラットなオブジェクトになりました
 * （layers 配列はありません）。3D表示・立体形状・複数レイヤーは廃止しています。
 * v1 の設定（{ global, layers } 形式）も normalizeConfig() で読み込めます。
 *
 * 遷移は3方式を自動で使い分けます（NenrinArt.canMorph で事前判定可）:
 *   morph     … 構造パラメータが一致する場合。形状そのものが連続変形します。
 *   forced    … force: true のとき。ほぼ全編モーフし、終盤だけ短く入れ替えます。
 *   crossfade … 構造が異なる場合。両者を同時描画し不透明度で入れ替えます。
 */
(function (global) {
  "use strict";

  // ---------------------------------------------------------------
  // Noise (seeded value noise) — drives the ring-to-ring spacing variance
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

  // =================================================================
  // Centre icon
  // =================================================================
  // An icon lives in the config as a path string made only of absolute
  // M / L / Z commands, already centred on its own centroid and scaled so its
  // farthest point sits at radius 1. svgToIcon() produces exactly that from
  // any SVG. Keeping to that subset means the runtime reads it synchronously
  // and without the DOM, and the string travels inside an exported config like
  // any other value.
  var ICON_SAMPLES = 480;
  var _iconCache = {};

  function parseIcon(str){
    if (!str) return null;
    if (Object.prototype.hasOwnProperty.call(_iconCache, str)) return _iconCache[str];
    var tok = String(str).match(/[MLZmlz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || [];
    var subs = [], cur = null;
    for (var i = 0; i < tok.length; ){
      var t = tok[i];
      if (t === 'M' || t === 'm'){ cur = []; subs.push(cur); i++; continue; }
      if (t === 'L' || t === 'l'){ i++; continue; }
      if (t === 'Z' || t === 'z'){ cur = null; i++; continue; }
      var x = parseFloat(t), y = parseFloat(tok[i + 1]);
      if (!isFinite(x) || !isFinite(y)) break;
      if (!cur){ cur = []; subs.push(cur); }
      cur.push(x, y);
      i += 2;
    }
    subs = subs.filter(function (s) { return s.length >= 6; });
    if (!subs.length) return (_iconCache[str] = null);

    // every subpath is treated as closed
    var edges = [], perimeter = 0;
    subs.forEach(function (s) {
      var n = s.length / 2;
      for (var k = 0; k < n; k++){
        var k1 = (k + 1) % n;
        edges.push(s[2*k], s[2*k+1], s[2*k1], s[2*k1+1]);
        perimeter += Math.hypot(s[2*k1] - s[2*k], s[2*k1+1] - s[2*k+1]);
      }
    });
    // evenly spaced boundary samples for the offset rings (see iconRadius);
    // every original vertex is kept so corners such as a heart's tip and notch
    // are represented exactly
    var step = perimeter / ICON_SAMPLES || 1, pts = [];
    for (var e = 0; e < edges.length; e += 4){
      var ax = edges[e], ay = edges[e+1], bx = edges[e+2], by = edges[e+3];
      var n2 = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
      for (var q = 0; q < n2; q++){
        var f = q / n2;
        pts.push(ax + (bx - ax) * f, ay + (by - ay) * f);
      }
    }
    var icon = { edges: new Float64Array(edges), pts: new Float64Array(pts) };
    _iconCache[str] = icon;
    return icon;
  }

  // Everything about the icon that a ring at angle j needs but that does not
  // depend on which ring is asking: where that ray leaves the icon, and where
  // each boundary sample sits along and across the ray.
  function iconProfile(icon, segments){
    var M = icon.pts.length / 2, E = icon.edges;
    var proj = new Float32Array(segments * M), perp2 = new Float32Array(segments * M);
    var r0 = new Float32Array(segments);
    for (var j = 0; j < segments; j++){
      var th = j / segments * Math.PI * 2, dx = Math.cos(th), dy = Math.sin(th);
      for (var q = 0; q < M; q++){
        var px = icon.pts[2*q], py = icon.pts[2*q+1];
        var pr = px * dx + py * dy;
        proj[j*M + q] = pr;
        perp2[j*M + q] = Math.max(0, px*px + py*py - pr*pr);
      }
      // outermost crossing of the ray with the outline: solve t*dir = a + s*edge
      var best = 0;
      for (var e = 0; e < E.length; e += 4){
        var ax = E[e], ay = E[e+1], ex = E[e+2] - ax, ey = E[e+3] - ay;
        var den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-12) continue;
        var tt = (ax * ey - ay * ex) / den;
        var ss = (ax * dy - ay * dx) / den;
        if (ss >= 0 && ss <= 1 && tt > best) best = tt;
      }
      r0[j] = best;
    }
    return { M: M, proj: proj, perp2: perp2, r0: r0 };
  }

  // Radius, along angle j, of the icon grown outward by distance dn (both in
  // icon units). Each ring is a true parallel offset of the icon — the outer
  // edge of a band of width dn around it — rather than a scaled copy. That is
  // what makes the rings soften naturally as they move out: a heart's notch
  // fills in and its tip rounds off, and far enough out the ring is simply
  // round. The offset is the union of discs of radius dn centred on the
  // outline, so along the ray it is the farthest disc exit.
  function iconRadius(prof, j, dn){
    var r = prof.r0[j];
    if (dn > 0){
      var M = prof.M, b = j * M, d2 = dn * dn, proj = prof.proj, perp2 = prof.perp2;
      for (var q = 0; q < M; q++){
        var p2 = perp2[b + q];
        if (p2 <= d2){
          var c = proj[b + q] + Math.sqrt(d2 - p2);
          if (c > r) r = c;
        }
      }
    }
    return r;
  }

  // Turns any SVG into the icon string the config stores. Needs a browser:
  // the SVG is mounted off-screen so the browser itself resolves every shape
  // type, transform and viewBox, then each outline is sampled point by point.
  function svgToIcon(svgText){
    if (typeof document === 'undefined') throw new Error('svgToIcon はブラウザ上でのみ使えます');
    var SVG_NS = 'http://www.w3.org/2000/svg';
    var doc = new DOMParser().parseFromString(String(svgText), 'image/svg+xml');
    var src = doc.documentElement;
    // Without an xmlns attribute the XML parser leaves every element outside
    // the SVG namespace, where shapes have no geometry to sample. The HTML
    // parser always puts <svg> in the right namespace, so fall back to it.
    if (!src || src.namespaceURI !== SVG_NS || doc.getElementsByTagName('parsererror').length){
      src = new DOMParser().parseFromString(String(svgText), 'text/html').querySelector('svg');
    }
    if (!src || src.namespaceURI !== SVG_NS) throw new Error('SVG として読み込めませんでした');
    var svg = document.importNode(src, true);
    // geometry only — nothing in the file gets to run or fetch anything
    Array.prototype.forEach.call(svg.querySelectorAll('script,foreignObject,image,a'), function (n) {
      n.parentNode.removeChild(n);
    });
    (function scrub(n){
      if (n.attributes) Array.prototype.slice.call(n.attributes).forEach(function (a) {
        if (/^on/i.test(a.name)) n.removeAttribute(a.name);
      });
      Array.prototype.forEach.call(n.children || [], scrub);
    })(svg);
    svg.setAttribute('width', '400');
    svg.setAttribute('height', '400');
    var host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:-10000px;top:0;width:400px;height:400px;visibility:hidden;pointer-events:none;overflow:hidden;';
    host.appendChild(svg);
    document.body.appendChild(host);

    var subs = [];
    try {
      var els = svg.querySelectorAll('path,rect,circle,ellipse,polygon,polyline,line');
      Array.prototype.forEach.call(els, function (el) {
        if (el.closest('defs,clipPath,mask,symbol,marker,pattern')) return;
        if (typeof el.getTotalLength !== 'function') return;
        var total = el.getTotalLength();
        if (!(total > 0)) return;
        var m = el.getCTM();
        var ms = m ? Math.hypot(m.a, m.b) : 1;
        var n = 600, step = total / n, cur = [], prev = null;
        for (var k = 0; k <= n; k++){
          var p = el.getPointAtLength(Math.min(total, k * step));
          var x = m ? m.a * p.x + m.c * p.y + m.e : p.x;
          var y = m ? m.b * p.x + m.d * p.y + m.f : p.y;
          // a moveto inside one path shows up as a jump between samples;
          // split there so separate pieces never get joined by a stray edge
          if (prev && Math.hypot(x - prev[0], y - prev[1]) > step * ms * 4 + 1e-6){
            if (cur.length >= 3) subs.push(cur);
            cur = [];
          }
          cur.push([x, y]);
          prev = [x, y];
        }
        if (cur.length >= 3) subs.push(cur);
      });
    } finally {
      document.body.removeChild(host);
    }
    if (!subs.length) throw new Error('SVG の中に図形が見つかりませんでした');
    return iconFromOutlines(subs);
  }

  // Centres outlines on the area they enclose, scales the farthest point to
  // radius 1, thins them to a sensible point count and writes the M/L/Z string.
  function iconFromOutlines(subs){
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    subs.forEach(function (s) { s.forEach(function (p) {
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    }); });
    var w = maxX - minX, h = maxY - minY;
    if (!(w > 0 || h > 0)) throw new Error('図形の大きさが0です');

    // The centre is the centroid of the filled area, found by rasterising —
    // that copes with holes and overlapping pieces without special cases, and
    // keeps the rings' origin inside the shape for the usual icon.
    var cx = minX + w / 2, cy = minY + h / 2;
    if (typeof document !== 'undefined'){
      var N = 192, sc = (N - 8) / Math.max(w, h);
      var cv = document.createElement('canvas');
      cv.width = N; cv.height = N;
      var ctx = cv.getContext('2d');
      ctx.translate(N / 2, N / 2);
      ctx.scale(sc, sc);
      ctx.translate(-(minX + w / 2), -(minY + h / 2));
      ctx.beginPath();
      subs.forEach(function (s) {
        ctx.moveTo(s[0][0], s[0][1]);
        for (var k = 1; k < s.length; k++) ctx.lineTo(s[k][0], s[k][1]);
        ctx.closePath();
      });
      ctx.fillStyle = '#000';
      ctx.fill('nonzero');
      var px = ctx.getImageData(0, 0, N, N).data, sx = 0, sy = 0, cnt = 0;
      for (var yy = 0; yy < N; yy++) for (var xx = 0; xx < N; xx++){
        if (px[(yy * N + xx) * 4 + 3] > 127){ sx += xx; sy += yy; cnt++; }
      }
      if (cnt > 0){
        cx = (sx / cnt + 0.5 - N / 2) / sc + minX + w / 2;
        cy = (sy / cnt + 0.5 - N / 2) / sc + minY + h / 2;
      }
    }

    var maxR = 0;
    subs.forEach(function (s) { s.forEach(function (p) {
      var r = Math.hypot(p[0] - cx, p[1] - cy);
      if (r > maxR) maxR = r;
    }); });
    if (!(maxR > 0)) throw new Error('図形の大きさが0です');

    // resample to ~360 points in total, shared out by outline length
    var lens = subs.map(function (s) {
      var L = 0;
      for (var k = 1; k < s.length; k++) L += Math.hypot(s[k][0] - s[k-1][0], s[k][1] - s[k-1][1]);
      return L;
    });
    var totalLen = lens.reduce(function (a, b) { return a + b; }, 0) || 1;
    var out = [];
    subs.forEach(function (s, si) {
      var count = Math.max(12, Math.round(360 * lens[si] / totalLen));
      var step = lens[si] / count, acc = 0, k = 1, pts = [s[0]];
      for (var c = 1; c < count; c++){
        var target = c * step;
        while (k < s.length){
          var segLen = Math.hypot(s[k][0] - s[k-1][0], s[k][1] - s[k-1][1]);
          if (acc + segLen >= target){
            var f = segLen > 0 ? (target - acc) / segLen : 0;
            pts.push([s[k-1][0] + (s[k][0] - s[k-1][0]) * f, s[k-1][1] + (s[k][1] - s[k-1][1]) * f]);
            break;
          }
          acc += segLen;
          k++;
        }
      }
      out.push(pts.map(function (p, i) {
        var x = +((p[0] - cx) / maxR).toFixed(3), y = +((p[1] - cy) / maxR).toFixed(3);
        return (i ? 'L' : 'M') + x + ' ' + y;
      }).join(' ') + ' Z');
    });
    return out.join(' ');
  }

  // =================================================================
  // Geometry
  // =================================================================
  // Each ring is a strip of two vertices per sample point (one either side of
  // the line). A vertex carries its own sample plus both neighbours, so the
  // vertex shader can place all three with the live wobble/outline/deform and
  // take the line's direction from them. That keeps the stroke an even width
  // however hard the ring bends — which matters once lines are bold: a normal
  // baked from the undeformed circle would visibly thin the line wherever the
  // outline or an icon turns it away from radial.
  //
  // One sample is [ringPos, growth, theta, wobbleU, iconF, ring, parallel]:
  //   ringPos  position in ring steps; continuous along a spiral
  //   growth   ring-to-ring spacing noise, resolved against spacingVarAmt in
  //            the shader so baseRadius / spacing / spacingVarAmt /
  //            eccentricity stay tweenable
  //   wobbleU  coordinate for the fine wobble noise
  //   iconF    ring radius multiplier that bends the ring toward the icon
  //   parallel accumulated growth-width variation, in ring steps (see below)
  var FLOATS = 20, STRIDE = FLOATS * 4;

  function buildGeometry(p){
    var noise = makeNoise2D(p.seed);
    var ringCount = Math.max(1, p.ringCount | 0);
    var segments = Math.max(8, p.segments | 0);
    var sb = Math.max(0, Math.min(1, p.spiralBlend || 0));
    // concentric rings close on themselves; a full spiral chains every ring
    // into one strand; anything between is left open at the seam
    var closed = sb < 0.001, chain = sb >= 0.999;

    // growth is sampled at the ring's integer index and at the continuous
    // spiral position, mixed by spiralBlend: stepped per ring when
    // concentric, seamless along the strand when fully spiral.
    function growthNorm(u){
      return noise(u * p.spacingVarFreq * 0.5 + 100, p.seed * 0.017) * u * 0.02;
    }

    var icon = parseIcon(p.icon);
    var S = p.baseRadius;
    var prof = (icon && S > 0.5) ? iconProfile(icon, segments) : null;

    // Parallel wobble — the gap between neighbouring rings changing along the
    // ring, the way a real cross-section bunches its rings tightly on one side
    // and lets them open out on another. Modelled the way a tree grows: each
    // year's growth width varies around the circumference (a noise field over
    // angle and ring index), and a ring sits at the *sum* of the widths inside
    // it. Summing means neighbours converge and diverge smoothly and keep
    // their order. The sum is then pinned at both ends (a bridge), so the pith
    // stays where it is and the outermost ring still follows the outline —
    // the silhouette stays under the outline controls and the bunching lives
    // inside it. Baked in ring steps; parallelAmt scales it in the shader, so
    // the amount itself tweens.
    //
    // Each year's variation is also ramped in over the inner third of the
    // rings: near the pith a ring is small next to the accumulated offset, and
    // full strength there dragged the first rings into lumps, where a real
    // pith is nearly round and the bunching builds outward. The ramp sits
    // inside the sum, so a ring still never crosses its neighbour.
    var pnoise = makeNoise2D(p.seed + 913);
    var pLen = Math.max(0.5, p.parallelLength || 6), pFreq = p.parallelFreq || 1.6;
    var pW = new Float32Array(ringCount), pWSum = new Float32Array(ringCount + 1);
    for (var pk = 0; pk < ringCount; pk++){
      var t = Math.min(1, (pk + 0.5) / (ringCount * 0.35));
      pW[pk] = t * t * (3 - 2 * t);
      pWSum[pk + 1] = pWSum[pk] + pW[pk];
    }
    var pStep = new Float32Array(segments * ringCount);
    var pSum = new Float32Array(segments * (ringCount + 1));
    for (var pj = 0; pj < segments; pj++){
      var pth = pj / segments * Math.PI * 2;
      var pcx = Math.cos(pth) * pFreq, pcy = Math.sin(pth) * pFreq, acc = 0;
      for (var pk2 = 0; pk2 < ringCount; pk2++){
        // walking k diagonally through the noise plane keeps each bunch
        // going for about parallelLength rings
        var v = pnoise(pcx + pk2 / pLen, pcy + pk2 / pLen * 0.71 + 37) * pW[pk2];
        pStep[pj * ringCount + pk2] = v;
        pSum[pj * (ringCount + 1) + pk2] = acc;
        acc += v;
      }
      pSum[pj * (ringCount + 1) + ringCount] = acc;
    }
    var pLast = Math.max(1, ringCount - 1);
    var pWLast = pWSum[pLast] || 1;
    function parallelAt(ringPos, j){
      j = j % segments;
      var k = Math.min(ringCount, Math.floor(ringPos)), f = ringPos - k;
      var inRange = k < ringCount;
      var sum = pSum[j * (ringCount + 1) + k] + (inRange ? f * pStep[j * ringCount + k] : 0);
      var w = pWSum[k] + (inRange ? f * pW[k] : 0);
      // the bridge correction follows the same ramp, so the innermost rings
      // are not shifted by it either
      return sum - (w / pWLast) * pSum[j * (ringCount + 1) + pLast];
    }

    function sample(i, j){
      var frac = j / segments;
      var ringPos = i + frac * sb;
      var gi = growthNorm(i), gu = growthNorm(i + frac);
      var f = 1;
      if (prof){
        var rNom = Math.max(0.4, S + ringPos * p.spacing);
        f = S * iconRadius(prof, j % segments, ringPos * p.spacing / S) / rNom;
      }
      // wobbleU must match at a closed ring's two ends (same angle), so only
      // the spiral's own advance moves it along the ring
      return [ringPos, gi + (gu - gi) * sb, frac * Math.PI * 2, i + sb * frac, f, i, parallelAt(ringPos, j)];
    }

    var strands = [], i, j;
    if (chain){
      var one = [];
      for (i = 0; i < ringCount; i++) for (j = 0; j < segments; j++) one.push(sample(i, j));
      one.push(sample(ringCount - 1, segments));
      strands.push({ pts: one, closed: false });
    } else {
      for (i = 0; i < ringCount; i++){
        var ring = [];
        // j === segments repeats angle 0, so the closing quad has its own
        // vertices and texture coordinates instead of wrapping the index
        for (j = 0; j <= segments; j++) ring.push(sample(i, j));
        strands.push({ pts: ring, closed: closed });
      }
    }

    var nVerts = 0, nIdx = 0;
    strands.forEach(function (st) { nVerts += st.pts.length * 2; nIdx += (st.pts.length - 1) * 6; });
    var data = new Float32Array(nVerts * FLOATS);
    var index = nVerts > 65535 ? new Uint32Array(nIdx) : new Uint16Array(nIdx);
    var o = 0, io = 0, vbase = 0;
    strands.forEach(function (st) {
      var P = st.pts, n = P.length;
      for (var k = 0; k < n; k++){
        var pk = P[k];
        // a closed ring's first and last samples are the same point, so their
        // outer neighbours are one step past the seam
        var pp = P[k > 0 ? k - 1 : (st.closed ? n - 2 : 0)];
        var pn = P[k < n - 1 ? k + 1 : (st.closed ? 1 : n - 1)];
        for (var side = -1; side <= 1; side += 2){
          data[o++] = pk[0]; data[o++] = pk[1]; data[o++] = pk[2]; data[o++] = pk[3];
          data[o++] = pp[0]; data[o++] = pp[1]; data[o++] = pp[2]; data[o++] = pp[3];
          data[o++] = pn[0]; data[o++] = pn[1]; data[o++] = pn[2]; data[o++] = pn[3];
          data[o++] = pp[4]; data[o++] = pk[4]; data[o++] = pn[4];
          data[o++] = pp[6]; data[o++] = pk[6]; data[o++] = pn[6];
          data[o++] = pk[5]; data[o++] = side;
        }
      }
      for (var q = 0; q < n - 1; q++){
        var a = vbase + q * 2, b = a + 2;
        index[io++] = a; index[io++] = a + 1; index[io++] = b;
        index[io++] = b; index[io++] = a + 1; index[io++] = b + 1;
      }
      vbase += n * 2;
    });
    return {
      data: data, index: index, verts: nVerts,
      // the icon bend is baked against these; see the re-bake check in render()
      bakedBase: p.baseRadius, bakedSpacing: p.spacing, hasIcon: !!prof
    };
  }

  // =================================================================
  // Config
  // =================================================================
  function defaultConfig(overrides){
    var d = {
      // where and how the piece sits
      bgColor: '#ffffff',
      textColor: '#2c2925',
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      animate: true,
      mouseDeform: true,
      mouseReact: false,
      mouseStrength: 30,
      // the line
      color: '#a6a6a6',
      opacity: 1,
      lineStyle: 'simple',
      lineWidth: 5,
      // how the width changes from the pith to the bark: the centre's width as
      // a ratio of the outermost, and the curve it follows getting there
      lineWidthInner: 0.8,
      lineWidthCurve: 1,
      // a rhythm across the rings: every Nth ring, counted in from the bark,
      // drawn heavier (0 = off)
      widthAccentEvery: 0,
      widthAccentAmt: 1,
      // swelling and thinning along each line: toward one side, and as a
      // brush-pressure wander
      widthDirAmt: 0,
      widthDirAngle: 0,
      widthNoiseAmt: 0,
      widthNoiseFreq: 3,
      // ring structure
      ringCount: 46,
      segments: 240,
      baseRadius: 6,
      spacing: 8,
      spiralBlend: 0,
      // centre icon
      icon: '',
      iconAmt: 1,
      // large undulation of the whole cross-section, growing toward the bark
      outlineAmt: 58,
      outlineFreq: 1.45,
      outlineGrowth: 1.35,
      // organic variance
      // the gap between neighbouring rings tightening and opening along the
      // ring: how strongly, how many times round, over how many rings
      parallelAmt: 0,
      parallelFreq: 1.6,
      parallelLength: 6,
      spacingVarAmt: 0.12,
      spacingVarFreq: 0.7,
      eccentricity: 0,
      eccentricityAngle: 0,
      bulgeAmt: 0,
      // ring-by-ring individuality
      ringWidthVar: 0,
      ringOpacityVar: 0,
      ringWobbleVar: 0.3,
      ringDrift: 1.5,
      // fine wobble and idle motion
      irregAmt: 1.2,
      irregFreq: 5,
      wobbleSpeed: 0.12,
      breatheAmp: 0.008,
      breatheSpeed: 0.3,
      growthAmt: 0,
      growthSpeed: 0.12,
      growthWaveCount: 4,
      rippleAmt: 0,
      rippleFreq: 4,
      rippleSpeed: 0.15,
      // deform
      deformMode: 'mouse',
      deformType: 'push',
      deformStrength: 24,
      deformRadius: 220,
      anchorX: 0,
      anchorY: 0,
      seed: 7
    };
    if (overrides) for (var k in overrides) if (k in d && overrides[k] !== undefined) d[k] = overrides[k];
    return d;
  }

  // Baked into the vertex buffer: two arts that differ here cannot morph and
  // are crossfaded (or force-morphed) instead. ringCount / segments set the
  // vertex count, spiralBlend how the rings chain, seed / spacingVarFreq which
  // noise is sampled, icon the shape every ring is bent toward.
  var STRUCTURAL_KEYS = ['ringCount', 'segments', 'spiralBlend', 'spacingVarFreq', 'seed', 'icon',
                         'parallelFreq', 'parallelLength'];
  // Not interpolatable: snapped at the midpoint of a morph.
  var DISCRETE_KEYS = ['lineStyle', 'deformMode', 'deformType', 'animate', 'mouseDeform', 'mouseReact'];
  var COLOR_KEYS = ['bgColor', 'textColor', 'color'];
  var _proto = defaultConfig();
  var NUM_KEYS = Object.keys(_proto).filter(function (k) {
    return typeof _proto[k] === 'number' && STRUCTURAL_KEYS.indexOf(k) < 0;
  });
  // Where the piece sits, as opposed to what it is. `stage: false` on a
  // transition leaves these alone so only the form changes.
  var STAGING_KEYS = ['scale', 'offsetX', 'offsetY'];
  // interpolated the short way round, so 350 -> 10 moves 20 degrees, not 340
  var ANGLE_KEYS = ['eccentricityAngle', 'widthDirAngle'];
  function lerpAngle(a, b, t) {
    var d = ((b - a) % 360 + 540) % 360 - 180;
    return a + d * t;
  }

  // Accepts the v2 flat config, and also v1 snapshots — either the tester's
  // { global, layers } JSON or the runtime's { ...camera, layers } — by taking
  // the first layer and dropping everything 3D.
  function normalizeConfig(cfg) {
    cfg = cfg || {};
    var src = cfg;
    if (cfg.global || Array.isArray(cfg.layers)){
      var g = cfg.global || cfg;
      var l = (cfg.layers && cfg.layers[0]) || {};
      src = {};
      Object.keys(l).forEach(function (k) { src[k] = l[k]; });
      ['bgColor', 'textColor', 'mouseReact', 'mouseStrength', 'mouseDeform'].forEach(function (k) {
        if (g[k] !== undefined) src[k] = g[k];
      });
      src.scale = (l.scale === undefined ? 1 : l.scale) * (g.globalScale === undefined ? 1 : g.globalScale);
    }
    return defaultConfig(src);
  }

  function canMorph(a, b) {
    a = normalizeConfig(a); b = normalizeConfig(b);
    for (var k = 0; k < STRUCTURAL_KEYS.length; k++){
      if (a[STRUCTURAL_KEYS[k]] !== b[STRUCTURAL_KEYS[k]]) return false;
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
  // Shaders
  // =================================================================
  var VERT_SRC = [
    "attribute vec4 aCur;",     // ringPos, growth, theta, wobbleU
    "attribute vec4 aPrev;",
    "attribute vec4 aNext;",
    "attribute vec3 aIcon;",    // icon bend of prev / cur / next
    "attribute vec3 aPar;",     // parallel wobble of prev / cur / next
    "attribute vec2 aMeta;",    // ring index, side of the line (-1 / +1)
    "uniform vec2 uResolution;",
    "uniform vec2 uTranslate;",
    "uniform float uScale;",
    "uniform float uLineWidthPx;",
    "uniform float uStyleV;",
    "uniform float uLineWidthInner;",
    "uniform float uLineWidthCurve;",
    "uniform vec2 uWidthAccent;",   // every N rings, extra width
    "uniform vec3 uWidthDir;",      // direction (x, y), amount
    "uniform vec2 uWidthNoise;",    // amount, frequency
    "uniform float uIrregAmt;",
    "uniform float uIrregFreq;",
    "uniform float uWobblePhase;",
    "uniform vec2 uSeedOffset;",
    "uniform vec2 uAnchorLocal;",
    "uniform float uDeformStrength;",
    "uniform float uDeformRadius;",
    "uniform int uDeformType;",
    "uniform float uRingCountInv;",
    "uniform float uBaseRadius;",
    "uniform float uSpacing;",
    "uniform float uSpacingVarAmt;",
    "uniform float uEccentricity;",
    "uniform vec2 uEccDir;",
    "uniform float uBulgeAmt;",
    "uniform float uGrowthPhase;",
    "uniform float uGrowthWaveCount;",
    "uniform float uGrowthAmt;",
    "uniform float uRippleAmt;",
    "uniform float uRippleFreq;",
    "uniform float uRipplePhase;",
    "uniform float uRingWidthVar;",
    "uniform float uRingOpacityVar;",
    "uniform float uRingWobbleVar;",
    "uniform float uRingDrift;",
    "uniform float uOutlineAmt;",
    "uniform float uOutlineFreq;",
    "uniform float uOutlineGrowth;",
    "uniform float uIconAmt;",
    "uniform float uParallelAmt;",
    "varying float vEdge;",
    "varying float vExtent;",
    "varying float vHalfW;",
    "varying float vSoft;",
    "varying highp vec2 vAlong;",
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
    // Where one sample lands, in design units. Evaluated for the vertex's own
    // sample and both neighbours, so the line direction follows every live
    // deformation. smoothP leaves out the fine wobble — the cursor deform
    // measures distance against it so the wobble cannot facet the line.
    "vec2 place(vec4 s, float iconF, float par, float wobMod, out vec2 smoothP){",
    "  float ringPos = s.x;",
    "  vec2 dir = vec2(cos(s.z), sin(s.z));",
    "  float ringN = clamp(ringPos * uRingCountInv, 0.0, 1.0);",
    "  float R = max(0.4, uBaseRadius + ringPos * uSpacing + s.y * uSpacing * uSpacingVarAmt",
    "                + par * uSpacing * uParallelAmt);",
    "  R *= mix(1.0, iconF, uIconAmt);",
    // one low-frequency field shared by every ring, so the rings bend together
    // and stay nested; its amplitude rises toward the bark, the way a real
    // cross-section is round at the pith and lobed at the edge
    "  float outline = noise3D(vec3(dir * uOutlineFreq + uSeedOffset * 0.37 + 17.0, uWobblePhase * 0.3))",
    "                * uOutlineAmt * pow(max(ringN, 0.0001), uOutlineGrowth);",
    "  float ripple = uRippleAmt * sin((ringN * uRippleFreq - uRipplePhase) * 6.28318530718);",
    "  vec2 center = uEccDir * (uEccentricity * ringPos * uRingCountInv);",
    "  float rs = R + outline + ripple;",
    "  float drift = s.w * uRingCountInv * uRingDrift;",
    "  float nx = dir.x * uIrregFreq + s.w * 0.37 + uSeedOffset.x + drift * 0.71;",
    "  float ny = dir.y * uIrregFreq + s.w * 0.37 + uSeedOffset.y - drift * 0.53;",
    // The fine wobble puts the same number of bumps on every ring, so on a
    // small ring near the pith they crowd into a short circumference and
    // read as a zigzag. Its amplitude is therefore capped against the bump
    // spacing (R / freq): outer rings keep the full amount, inner rings ease
    // toward round. A soft minimum, so there is no visible point where the
    // cap kicks in.
    "  float wobCap = 0.1 * R / max(uIrregFreq, 0.2);",
    "  float wobAmp = uIrregAmt * wobCap * inversesqrt(uIrregAmt * uIrregAmt + wobCap * wobCap + 1e-6);",
    "  float wob = noise3D(vec3(nx, ny, uWobblePhase)) * wobAmp * wobMod;",
    "  float bulge = 1.0 + uBulgeAmt * sin(ringN * 3.14159265);",
    "  smoothP = (center + dir * rs) * bulge;",
    "  vec2 p = (center + dir * (rs + wob)) * bulge;",
    "  float d = distance(smoothP, uAnchorLocal);",
    "  float influence = exp(-(d*d) / (2.0 * uDeformRadius * uDeformRadius + 0.001));",
    "  vec2 rel = smoothP - uAnchorLocal;",
    // the push/pull direction eases in over a small core instead of flipping
    // at the cursor itself — a bold line passing right under the pointer
    // would otherwise be folded into a sharp cusp
    "  float core = uDeformRadius * 0.18;",
    "  vec2 rdir = rel / sqrt(dot(rel, rel) + core * core);",
    "  if (uDeformType == 1) {",
    "    p -= rdir * uDeformStrength * influence;",
    "  } else if (uDeformType == 2) {",
    "    float ang = uDeformStrength * influence * 0.02;",
    "    float ca = cos(ang), sa = sin(ang);",
    "    vec2 q = p - uAnchorLocal;",
    "    p = uAnchorLocal + vec2(q.x*ca - q.y*sa, q.x*sa + q.y*ca);",
    "  } else {",
    "    p += rdir * uDeformStrength * influence;",
    "  }",
    "  return p;",
    "}",
    "void main(){",
    "  float ring = aMeta.x;",
    "  float side = aMeta.y;",
    "  float ringHashW = fract(sin(ring * 12.9898 + uSeedOffset.x * 78.233 + 4.7) * 43758.5453123);",
    "  float ringHashO = fract(sin(ring * 39.3468 + uSeedOffset.y * 11.135 + 19.19) * 24634.6345);",
    "  float ringHashN = fract(sin(ring * 71.2351 + uSeedOffset.x * 3.719 + uSeedOffset.y * 5.331 + 91.7) * 12945.734);",
    "  float ringWidthMod = max(0.15, 1.0 + (ringHashW - 0.5) * 2.0 * uRingWidthVar);",
    "  vRingOpacity = clamp(1.0 + (ringHashO - 0.5) * 2.0 * uRingOpacityVar, 0.15, 1.35);",
    "  float wobMod = max(0.0, 1.0 + (ringHashN - 0.5) * 2.0 * uRingWobbleVar);",
    "  vec2 sp;",
    "  vec2 P  = place(aCur,  aIcon.y, aPar.y, wobMod, sp);",
    "  vec2 Pp = place(aPrev, aIcon.x, aPar.x, wobMod, sp);",
    "  vec2 Pn = place(aNext, aIcon.z, aPar.z, wobMod, sp);",
    // Offset along the miter of the two adjacent segments so neighbouring
    // quads share their edge exactly — no gaps and no overlaps at the joints,
    // and the stroke keeps its width through a bend. Capped so a hairpin (the
    // notch of a heart) cannot shoot a spike out.
    "  vec2 t1 = P - Pp, t2 = Pn - P;",
    "  float l1 = length(t1), l2 = length(t2);",
    "  if (l1 < 1e-5) { t1 = t2; l1 = l2; }",
    "  if (l2 < 1e-5) { t2 = t1; l2 = l1; }",
    "  t1 /= max(l1, 1e-5); t2 /= max(l2, 1e-5);",
    "  vec2 n1 = vec2(-t1.y, t1.x), n2 = vec2(-t2.y, t2.x);",
    "  vec2 m = n1 + n2;",
    "  float ml = length(m);",
    "  m = ml > 1e-4 ? m / ml : n1;",
    "  float miter = 1.0 / max(dot(m, n1), 0.35);",
    "  float ringN = clamp(aCur.x * uRingCountInv, 0.0, 1.0);",
    // pith to bark, along a curve: below 1 the change happens near the
    // centre, above 1 it is held back toward the bark
    "  float wRadial = mix(uLineWidthInner, 1.0, pow(max(ringN, 0.0001), uLineWidthCurve));",
    // every Nth ring counted in from the bark, so the outermost ring is
    // always one of the accented ones
    "  float wAccent = 1.0;",
    "  if (uWidthAccent.x >= 1.0) {",
    "    float fromBark = floor(1.0 / uRingCountInv + 0.5) - ring;",
    "    if (mod(fromBark + 0.5, floor(uWidthAccent.x + 0.5)) < 1.0) wAccent += uWidthAccent.y;",
    "  }",
    // thicker toward one side and thinner on the other, like a stroke laid
    // with a broad nib or a tree that grew faster on its sunny side
    "  vec2 dirC = vec2(cos(aCur.z), sin(aCur.z));",
    "  float wDir = 1.0 + uWidthDir.z * dot(dirC, uWidthDir.xy);",
    // a slow wander along each line, as brush pressure would give; nearby
    // rings wander alike so the swelling reads as a passage, not static
    "  float wn = noise3D(vec3(dirC * uWidthNoise.y + uSeedOffset * 0.21 + 41.0, ring * 0.23 + uWobblePhase * 0.15));",
    "  float wNoise = 1.0 + uWidthNoise.x * clamp(wn * 1.4, -1.0, 1.0);",
    "  float hw = 0.5 * uLineWidthPx * ringWidthMod * wRadial * wAccent * max(wDir, 0.0) * max(wNoise, 0.0);",
    // Room beyond the visible edge for the soft styles to fall off in, in
    // pixels and growing with the line: a fixed multiple of the width worked
    // for hairlines but melted bold lines into their neighbours.
    "  float soft = 0.0;",
    "  if (uStyleV == 1.0) soft = 0.9 + hw * 0.6;",
    "  else if (uStyleV == 3.0) soft = (1.0 + hw * 0.9) * 1.2;",
    // plus one pixel of geometry beyond the edge for antialiasing
    "  float extent = hw + soft + 1.0;",
    "  vec2 pos = uTranslate + P * uScale + m * side * extent * miter;",
    "  vEdge = side;",
    "  vExtent = extent;",
    "  vHalfW = hw;",
    "  vSoft = soft;",
    // texture coordinate for the analogue line styles: a point on a circle
    // whose circumference tracks the ring's own, so ink and watercolour
    // grain keep the same density on small and large rings and wrap without
    // a seam at angle 0
    "  vAlong = vec2(cos(aCur.z), sin(aCur.z)) * (uBaseRadius + aCur.x * uSpacing) * 0.09;",
    "  float ringNd = clamp(ring * uRingCountInv, 0.0, 1.0);",
    "  float growthWave = 0.5 + 0.5 * cos((ringNd * uGrowthWaveCount - uGrowthPhase) * 6.28318530718);",
    "  vGrowth = mix(1.0, growthWave, uGrowthAmt);",
    "  vec2 clip = pos / uResolution * 2.0 - 1.0;",
    "  clip.y = -clip.y;",
    "  gl_Position = vec4(clip, 0.0, 1.0);",
    "}"
  ].join("\n");

  // Four ways of inking the same stroke. vEdge runs -1..1 across the drawn
  // ribbon and vExtent is that ribbon's half-width in pixels, so vEdge *
  // vExtent is the signed distance from the stroke's centre; vHalfW is the
  // visible half-width and vSoft the extra room a soft style was given.
  // vAlong travels with the stroke for the analogue textures.
  var FRAG_SRC = [
    "precision mediump float;",
    "uniform vec4 uColor;",
    "uniform int uLineStyle;",
    // the vertex stage declares this at the default highp, so match it here or
    // the program fails to link on a precision mismatch
    "uniform highp vec2 uSeedOffset;",
    "varying float vEdge;",
    "varying float vExtent;",
    "varying float vHalfW;",
    "varying float vSoft;",
    "varying highp vec2 vAlong;",
    "varying float vGrowth;",
    "varying float vRingOpacity;",
    "float h31(highp vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123); }",
    "float n31(highp vec3 p){",
    "  highp vec3 i = floor(p);",
    "  vec3 f = fract(p);",
    "  f = f * f * (3.0 - 2.0 * f);",
    "  float a = h31(i), b = h31(i + vec3(1.0, 0.0, 0.0));",
    "  float c = h31(i + vec3(0.0, 1.0, 0.0)), d = h31(i + vec3(1.0, 1.0, 0.0));",
    "  float e = h31(i + vec3(0.0, 0.0, 1.0)), g = h31(i + vec3(1.0, 0.0, 1.0));",
    "  float h = h31(i + vec3(0.0, 1.0, 1.0)), k = h31(i + vec3(1.0, 1.0, 1.0));",
    "  return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y), mix(mix(e, g, f.x), mix(h, k, f.x), f.y), f.z);",
    "}",
    "void main(){",
    "  float across = vEdge * vExtent;",
    "  float dpx = abs(across);",
    "  highp vec2 a = vAlong + uSeedOffset;",
    "  float alpha;",
    "  if (uLineStyle == 1) {",
    // blur: a solid stroke whose edge dissolves over vSoft pixels — no hard
    // edge for neighbouring rings to beat against, while a bold line stays a
    // line; a hairline thinner than its softening comes out lighter
    "    alpha = 1.0 - smoothstep(vHalfW - vSoft, vHalfW + vSoft, dpx);",
    "  } else if (uLineStyle == 2) {",
    // ink: a dry brush leaves fine striations running along the stroke, and
    // gives out in patches and toward its edges
    "    float body = clamp(vHalfW + 0.5 - dpx, 0.0, 1.0);",
    "    float stri = n31(vec3(a * 0.35, across * 0.55));",
    "    float dry = n31(vec3(a * 0.08, 3.1));",
    "    float edgeDry = smoothstep(0.35, 1.0, dpx / max(vHalfW, 0.5));",
    "    float thresh = clamp(dry * 0.55 + edgeDry * 0.35 - 0.08, 0.05, 0.85);",
    "    alpha = body * smoothstep(thresh - 0.1, thresh + 0.1, stri);",
    "  } else if (uLineStyle == 3) {",
    // watercolour: a translucent body with uneven pooling, a ragged wet edge,
    // and pigment collecting into a darker rim just inside it
    "    float bleed = vSoft / 1.2;",
    "    float rag = (n31(vec3(a * 0.5, 1.7)) - 0.5) * bleed;",
    "    float edgeR = vHalfW + rag * 0.8 + bleed * 0.3;",
    "    float inside = 1.0 - smoothstep(edgeR - bleed * 0.6, edgeR + bleed * 0.4, dpx);",
    "    float rim = smoothstep(edgeR - bleed * 0.9, edgeR - bleed * 0.1, dpx) * inside;",
    "    float pool = n31(vec3(a * 0.12, 7.3));",
    "    alpha = min(1.0, inside * (0.36 + 0.32 * pool) + rim * 0.38);",
    "  } else {",
    // simple: coverage of the visible half-width, resolved to the pixel; a
    // hairline below a pixel fades rather than flickering
    "    alpha = clamp(vHalfW + 0.5 - dpx, 0.0, 1.0) * min(1.0, vHalfW + 0.5);",
    "  }",
    "  gl_FragColor = vec4(uColor.rgb, uColor.a * alpha * vGrowth * vRingOpacity);",
    "}"
  ].join("\n");

  var LINE_STYLES = { simple: 0, blur: 1, ink: 2, watercolor: 3 };
  var DEFORM_TYPES = { push: 0, pull: 1, swirl: 2 };

  // =================================================================
  // Instance factory
  // =================================================================
  function create(canvasEl, config, opts) {
    opts = opts || {};
    var onStats = opts.onStats || null;
    // Idle motion left running under a transition (see render / transitionTo).
    var defaultCalm = opts.calm === undefined ? 0.15 : Math.max(0, Math.min(1, opts.calm));
    var defaultStage = opts.stage === undefined ? true : !!opts.stage;

    var canvas = canvasEl;
    var gl = canvas.getContext('webgl', { antialias: true, alpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('NenrinArt: WebGL is not supported in this browser.');
    var extUint = gl.getExtension('OES_element_index_uint');

    function compile(type, src){
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh));
      return sh;
    }
    function link(vs, fs){
      var p = gl.createProgram();
      gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p));
      return p;
    }

    var prog = link(VERT_SRC, FRAG_SRC);
    var A = {}, U = {};
    var ATTRS = ['aCur', 'aPrev', 'aNext', 'aIcon', 'aPar', 'aMeta'];
    ATTRS.forEach(function (n) { A[n] = gl.getAttribLocation(prog, n); });
    ['uResolution', 'uTranslate', 'uScale', 'uLineWidthPx', 'uStyleV', 'uLineWidthInner',
     'uLineWidthCurve', 'uWidthAccent', 'uWidthDir', 'uWidthNoise',
     'uLineStyle', 'uColor', 'uIrregAmt', 'uIrregFreq', 'uWobblePhase', 'uSeedOffset',
     'uAnchorLocal', 'uDeformStrength', 'uDeformRadius', 'uDeformType', 'uRingCountInv',
     'uBaseRadius', 'uSpacing', 'uSpacingVarAmt', 'uEccentricity', 'uEccDir', 'uBulgeAmt',
     'uGrowthPhase', 'uGrowthWaveCount', 'uGrowthAmt', 'uRippleAmt', 'uRippleFreq', 'uRipplePhase',
     'uRingWidthVar', 'uRingOpacityVar', 'uRingWobbleVar', 'uRingDrift',
     'uOutlineAmt', 'uOutlineFreq', 'uOutlineGrowth', 'uIconAmt', 'uParallelAmt'
    ].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    gl.enable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    // ---------------------------------------------------------------
    // Offscreen compositing. Where a stroke overlaps itself (the inside of a
    // tight bend, or neighbouring rings once the line is wider than their
    // spacing) blending straight onto the canvas would double-darken it. The
    // art is first drawn into a texture with MAX blending — the colour is
    // constant, so the max alpha is a clean coverage mask — and that texture
    // is composited onto the canvas once.
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
    var blitProg = link([
      "attribute vec2 aQuadPos;",
      "varying vec2 vUv;",
      "void main(){ vUv = aQuadPos * 0.5 + 0.5; gl_Position = vec4(aQuadPos, 0.0, 1.0); }"
    ].join("\n"), [
      "precision mediump float;",
      "uniform sampler2D uTex;",
      "varying vec2 vUv;",
      "void main(){ gl_FragColor = texture2D(uTex, vUv); }"
    ].join("\n"));
    var locQuadPos = gl.getAttribLocation(blitProg, 'aQuadPos');
    var locBlitTex = gl.getUniformLocation(blitProg, 'uTex');
    var quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

    // ---------------------------------------------------------------
    // Slots: what is on screen. Normally just the live art; a crossfade
    // briefly adds the incoming one. Each keeps its own geometry and its own
    // accumulated animation phases.
    // ---------------------------------------------------------------
    var state = normalizeConfig(config);
    function newPhase(){ return { wobble: 0, ripple: 0, growth: 0, breathe: 0 }; }
    var live = { cfg: state, alpha: 1, geom: null, ph: newPhase() };
    var _slots = [live];
    var _running = true, _raf = 0, _tr = null;

    function uploadGeometry(built){
      var g = { vbo: gl.createBuffer(), ibo: null, count: 0, indexType: 0,
                bakedBase: built.bakedBase, bakedSpacing: built.bakedSpacing, hasIcon: built.hasIcon,
                verts: built.verts };
      var data = built.data, index = built.index;
      gl.bindBuffer(gl.ARRAY_BUFFER, g.vbo);
      if (index instanceof Uint32Array && !extUint){
        // no 32-bit indices on this device: expand to plain triangles
        var flat = new Float32Array(index.length * FLOATS);
        for (var i = 0; i < index.length; i++){
          flat.set(data.subarray(index[i] * FLOATS, index[i] * FLOATS + FLOATS), i * FLOATS);
        }
        gl.bufferData(gl.ARRAY_BUFFER, flat, gl.STATIC_DRAW);
        g.count = index.length;
        return g;
      }
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      g.ibo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);
      g.count = index.length;
      g.indexType = index instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
      return g;
    }
    function freeGeometry(g){
      if (!g) return;
      gl.deleteBuffer(g.vbo);
      if (g.ibo) gl.deleteBuffer(g.ibo);
    }

    function regen(){
      freeGeometry(live.geom);
      live.geom = uploadGeometry(buildGeometry(state));
      updateStats();
    }

    function updateStats(){
      if (onStats) onStats({ rings: state.ringCount, verts: live.geom ? live.geom.verts : 0 });
    }

    // ---------------------------------------------------------------
    // Rendering
    // ---------------------------------------------------------------
    function hexToRgb(hex){
      var v = parseInt(String(hex).replace('#',''), 16);
      return [((v>>16)&255)/255, ((v>>8)&255)/255, (v&255)/255];
    }

    var mouseClientX = 0, mouseClientY = 0, hasMouse = false;
    function onMouseMove(e){ mouseClientX = e.clientX; mouseClientY = e.clientY; hasMouse = true; }
    window.addEventListener('mousemove', onMouseMove);

    var lastFrameMs = performance.now();
    // 1 = full idle motion; eases toward a transition's `calm` while it runs.
    // Slowing the clock rather than scaling amplitudes keeps every phase
    // continuous, so nothing jumps when the damping comes and goes.
    var ambient = 1;

    // Phases are accumulated (phase += dt * speed) rather than recomputed as
    // elapsed * speed: the speeds are tweenable, and with elapsed * speed a
    // change of speed would swing the phase by the whole elapsed time.
    function advance(slot, step){
      var c = slot.cfg, p = slot.ph;
      if (c.animate === false) return;
      p.wobble = (p.wobble + step * (c.wobbleSpeed || 0)) % 4000;
      p.ripple += step * (c.rippleSpeed || 0);
      p.growth += step * (c.growthSpeed || 0);
      p.breathe += step * (c.breatheSpeed || 0);
    }

    function resize(){
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var W = Math.round(canvas.clientWidth * dpr), H = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== W || canvas.height !== H){ canvas.width = W; canvas.height = H; }
      return dpr;
    }

    function setAttribs(g){
      gl.bindBuffer(gl.ARRAY_BUFFER, g.vbo);
      gl.vertexAttribPointer(A.aCur, 4, gl.FLOAT, false, STRIDE, 0);
      gl.vertexAttribPointer(A.aPrev, 4, gl.FLOAT, false, STRIDE, 16);
      gl.vertexAttribPointer(A.aNext, 4, gl.FLOAT, false, STRIDE, 32);
      gl.vertexAttribPointer(A.aIcon, 3, gl.FLOAT, false, STRIDE, 48);
      gl.vertexAttribPointer(A.aPar, 3, gl.FLOAT, false, STRIDE, 60);
      gl.vertexAttribPointer(A.aMeta, 2, gl.FLOAT, false, STRIDE, 72);
      ATTRS.forEach(function (n) { gl.enableVertexAttribArray(A[n]); });
      if (g.ibo) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.ibo);
    }

    function drawSlot(slot, dpr, mouse){
      var c = slot.cfg, g = slot.geom, ph = slot.ph;
      if (!g || !g.count || slot.alpha <= 0) return;
      gl.useProgram(prog);
      gl.uniform2f(U.uResolution, canvas.width, canvas.height);

      var breathPhase = (c.seed % 97) * 0.0647;
      var breathe = 1 + (c.breatheAmp || 0) * Math.sin(ph.breathe + breathPhase);
      var s = c.scale * dpr * breathe;
      var parX = 0, parY = 0;
      if (c.mouseReact){ parX = mouse.nx * c.mouseStrength; parY = mouse.ny * c.mouseStrength; }
      var tx = canvas.width / 2 + (c.offsetX + parX) * dpr;
      var ty = canvas.height / 2 + (c.offsetY + parY) * dpr;
      // the deform anchor in the art's own design space: the live cursor, or
      // a fixed point the author placed
      var lx, ly;
      if (c.deformMode === 'fixed'){ lx = c.anchorX; ly = c.anchorY; }
      else { var inv = s || 1e-6; lx = (mouse.wx - tx) / inv; ly = (mouse.wy - ty) / inv; }

      gl.uniform2f(U.uTranslate, tx, ty);
      gl.uniform1f(U.uScale, s);
      // the stroke scales with the art, like an SVG stroke, so a piece keeps
      // its proportions in a smaller or larger block
      gl.uniform1f(U.uLineWidthPx, Math.max(0.1, c.lineWidth) * dpr * c.scale);
      gl.uniform1f(U.uStyleV, LINE_STYLES[c.lineStyle] || 0);
      gl.uniform1f(U.uLineWidthInner, c.lineWidthInner === undefined ? 1 : c.lineWidthInner);
      gl.uniform1f(U.uLineWidthCurve, Math.max(0.05, c.lineWidthCurve || 1));
      gl.uniform2f(U.uWidthAccent, c.widthAccentEvery || 0, c.widthAccentAmt || 0);
      var wdRad = (c.widthDirAngle || 0) * Math.PI / 180;
      gl.uniform3f(U.uWidthDir, Math.cos(wdRad), Math.sin(wdRad), c.widthDirAmt || 0);
      gl.uniform2f(U.uWidthNoise, c.widthNoiseAmt || 0, c.widthNoiseFreq || 0);
      gl.uniform1i(U.uLineStyle, LINE_STYLES[c.lineStyle] || 0);
      var rgb = hexToRgb(c.color);
      gl.uniform4f(U.uColor, rgb[0], rgb[1], rgb[2], c.opacity * slot.alpha);
      gl.uniform1f(U.uIrregAmt, c.irregAmt);
      gl.uniform1f(U.uIrregFreq, c.irregFreq);
      gl.uniform1f(U.uWobblePhase, ph.wobble);
      gl.uniform2f(U.uSeedOffset, c.seed * 0.173, c.seed * 0.911);
      gl.uniform2f(U.uAnchorLocal, lx, ly);
      gl.uniform1f(U.uDeformStrength, (c.mouseDeform || c.deformMode === 'fixed') ? c.deformStrength : 0);
      gl.uniform1f(U.uDeformRadius, Math.max(1, c.deformRadius));
      gl.uniform1i(U.uDeformType, DEFORM_TYPES[c.deformType] || 0);
      gl.uniform1f(U.uRingCountInv, 1 / Math.max(1, c.ringCount - 1));
      gl.uniform1f(U.uBaseRadius, c.baseRadius);
      gl.uniform1f(U.uSpacing, c.spacing);
      gl.uniform1f(U.uSpacingVarAmt, c.spacingVarAmt);
      gl.uniform1f(U.uEccentricity, c.eccentricity);
      var eccRad = (c.eccentricityAngle || 0) * Math.PI / 180;
      gl.uniform2f(U.uEccDir, Math.cos(eccRad), Math.sin(eccRad));
      gl.uniform1f(U.uBulgeAmt, c.bulgeAmt || 0);
      gl.uniform1f(U.uGrowthPhase, ph.growth);
      gl.uniform1f(U.uGrowthWaveCount, Math.max(0.01, c.growthWaveCount || 0.01));
      gl.uniform1f(U.uGrowthAmt, Math.min(1, Math.max(0, c.growthAmt || 0)));
      gl.uniform1f(U.uRippleAmt, c.rippleAmt || 0);
      gl.uniform1f(U.uRippleFreq, c.rippleFreq || 0);
      gl.uniform1f(U.uRipplePhase, ph.ripple);
      gl.uniform1f(U.uRingWidthVar, c.ringWidthVar || 0);
      gl.uniform1f(U.uRingOpacityVar, c.ringOpacityVar || 0);
      gl.uniform1f(U.uRingWobbleVar, c.ringWobbleVar || 0);
      gl.uniform1f(U.uRingDrift, c.ringDrift || 0);
      gl.uniform1f(U.uOutlineAmt, c.outlineAmt || 0);
      gl.uniform1f(U.uOutlineFreq, c.outlineFreq || 0);
      gl.uniform1f(U.uOutlineGrowth, Math.max(0, c.outlineGrowth || 0));
      gl.uniform1f(U.uIconAmt, g.hasIcon ? Math.min(1, Math.max(0, c.iconAmt)) : 0);
      gl.uniform1f(U.uParallelAmt, c.parallelAmt || 0);

      // pass 1: coverage mask with MAX blending
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.blendEquation(MAX_EQ);
      setAttribs(g);
      if (g.ibo) gl.drawElements(gl.TRIANGLES, g.count, g.indexType, 0);
      else gl.drawArrays(gl.TRIANGLES, 0, g.count);

      // pass 2: composite onto the canvas once
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(blitProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.vertexAttribPointer(locQuadPos, 2, gl.FLOAT, false, 8, 0);
      gl.enableVertexAttribArray(locQuadPos);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fboTex);
      gl.uniform1i(locBlitTex, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function render(){
      _stepTransition();
      var dpr = resize();
      if (canvas.width <= 0 || canvas.height <= 0){
        if (_running) _raf = requestAnimationFrame(render);
        return;
      }
      // The icon bend is baked against the base radius and spacing it was
      // built with. Both are tweenable sliders, so once they settle on new
      // values the geometry is rebuilt to match — never mid-transition, where
      // the ratio-based bend is a close enough approximation.
      if (!_tr && live.geom && live.geom.hasIcon &&
          (live.geom.bakedBase !== state.baseRadius || live.geom.bakedSpacing !== state.spacing)){
        regen();
      }
      ensureFBO(canvas.width, canvas.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      var bg = hexToRgb(state.bgColor);
      gl.clearColor(bg[0], bg[1], bg[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      var nowMs = performance.now();
      var dt = Math.min(0.05, (nowMs - lastFrameMs) / 1000);
      lastFrameMs = nowMs;
      ambient += ((_tr ? _tr.calm : 1) - ambient) * Math.min(1, dt * 5);
      _slots.forEach(function (sl) { advance(sl, dt * ambient); });

      var rect = canvas.getBoundingClientRect();
      var mouse = { nx: 0, ny: 0, wx: -canvas.width * 4, wy: -canvas.height * 4 };
      if (hasMouse && rect.width > 0 && rect.height > 0){
        mouse.nx = ((mouseClientX - rect.left) / rect.width) * 2 - 1;
        mouse.ny = ((mouseClientY - rect.top) / rect.height) * 2 - 1;
        mouse.wx = (mouseClientX - rect.left) * dpr;
        mouse.wy = (mouseClientY - rect.top) * dpr;
      }
      _slots.forEach(function (sl) { drawSlot(sl, dpr, mouse); });

      if (_running) _raf = requestAnimationFrame(render);
    }

    // ---------------------------------------------------------------
    // Transitions
    // ---------------------------------------------------------------
    function tweenInto(dst, from, to, e){
      NUM_KEYS.forEach(function (k) {
        dst[k] = ANGLE_KEYS.indexOf(k) >= 0
          ? lerpAngle(from[k], to[k], e)
          : from[k] + (to[k] - from[k]) * e;
      });
      COLOR_KEYS.forEach(function (k) { dst[k] = mixHex(from[k], to[k], e); });
      if (e >= 0.5) DISCRETE_KEYS.forEach(function (k) { dst[k] = to[k]; });
    }

    function _beginIncoming(tr){
      tr.incoming = {
        cfg: tr.to, alpha: 0,
        geom: uploadGeometry(buildGeometry(tr.to)),
        // carry the live phases over so the wobble does not restart
        ph: Object.assign({}, live.ph)
      };
      _slots = [live, tr.incoming];
    }

    function _finishTransition(){
      if (!_tr) return;
      var tr = _tr;
      _tr = null;
      if (tr.mode === 'morph'){
        NUM_KEYS.concat(COLOR_KEYS, DISCRETE_KEYS).forEach(function (k) { state[k] = tr.to[k]; });
      } else {
        if (!tr.incoming) _beginIncoming(tr);
        Object.keys(tr.to).forEach(function (k) { state[k] = tr.to[k]; });
        freeGeometry(live.geom);
        live.geom = tr.incoming.geom;
        live.ph = tr.incoming.ph;
      }
      _slots = [live];
      live.alpha = 1;
      updateStats();
      if (tr.onComplete) tr.onComplete();
    }

    function _stepTransition(){
      if (!_tr) return;
      var tr = _tr;
      var t = tr.duration <= 0 ? 1 : Math.min(1, (performance.now() - tr.start) / tr.duration);
      var e = tr.ease(t);
      if (tr.mode === 'morph'){
        tweenInto(state, tr.from, tr.to, e);
      } else if (tr.mode === 'forced'){
        // Morph as far as the shared parameters allow, then hand over to the
        // real target with a short crossfade. By then colour, radius, spacing,
        // outline and line width all agree — only the baked structure still
        // differs — so the swap is hard to see.
        tweenInto(state, tr.from, tr.to, tr.ease(Math.min(1, t / tr.split)));
        if (t > tr.split){
          if (!tr.incoming) _beginIncoming(tr);
          var bt = (t - tr.split) / (1 - tr.split);
          live.alpha = 1 - bt;
          tr.incoming.alpha = bt;
        }
      } else {
        // the background and text colours belong to the page rather than to
        // either art, so they move across on the live state
        state.bgColor = mixHex(tr.from.bgColor, tr.to.bgColor, e);
        state.textColor = mixHex(tr.from.textColor, tr.to.textColor, e);
        live.alpha = 1 - e;
        tr.incoming.alpha = e;
      }
      if (t >= 1) _finishTransition();
    }

    function cancelTransition(){
      if (!_tr) return;
      if (_tr.incoming) freeGeometry(_tr.incoming.geom);
      _tr = null;
      _slots = [live];
      live.alpha = 1;
    }

    // Animates from the current look to `target`. Structural parameters decide
    // whether this is a true morph or a crossfade; `force` morphs anyway.
    function transitionTo(target, o){
      o = o || {};
      cancelTransition();
      var to = normalizeConfig(target);
      var stage = o.stage === undefined ? defaultStage : !!o.stage;
      // hold the placement: the target is taken at the current position/scale
      if (!stage) STAGING_KEYS.forEach(function (k) { to[k] = state[k]; });

      var mode = canMorph(state, to) ? 'morph' : (o.force ? 'forced' : 'crossfade');
      var tr = {
        mode: mode, start: performance.now(),
        duration: o.duration === undefined ? 1200 : o.duration,
        ease: typeof o.easing === 'function' ? o.easing : (EASINGS[o.easing] || EASINGS.easeInOutCubic),
        from: Object.assign({}, state), to: to,
        onComplete: o.onComplete || null,
        // how much idle motion to leave running underneath: 1 keeps the piece
        // fully alive, 0 freezes it so only the change itself moves
        calm: o.calm === undefined ? defaultCalm : Math.max(0, Math.min(1, o.calm)),
        split: o.split === undefined ? 0.82 : o.split,
        incoming: null
      };
      if (mode === 'crossfade') _beginIncoming(tr);
      _tr = tr;
      if (tr.duration <= 0) _finishTransition();
      return mode;
    }

    // Instant swap, no animation.
    function setConfig(cfg){
      cancelTransition();
      var n = normalizeConfig(cfg);
      Object.keys(n).forEach(function (k) { state[k] = n[k]; });
      regen();
    }

    function destroy(){
      _running = false;
      if (_raf) cancelAnimationFrame(_raf);
      window.removeEventListener('mousemove', onMouseMove);
      cancelTransition();
      freeGeometry(live.geom);
      live.geom = null;
    }

    regen();
    _raf = requestAnimationFrame(render);

    return {
      canvas: canvas,
      // the live config — writing to it shows on the next frame; structural
      // keys (NenrinArt.STRUCTURAL_KEYS) also need regen()
      state: state,
      getConfig: function () { return Object.assign({}, state); },
      setConfig: setConfig,
      transitionTo: transitionTo,
      cancelTransition: cancelTransition,
      isTransitioning: function () { return !!_tr; },
      regen: regen,
      updateStats: updateStats,
      // The idle-animation phases (wobble, ripple, growth wave, breathing).
      // Saving them alongside the config and restoring both reproduces one
      // exact frame — the tester embeds them in exported PNGs for that.
      getPhase: function () { return Object.assign({}, live.ph); },
      setPhase: function (ph) {
        Object.keys(live.ph).forEach(function (k) {
          if (ph && typeof ph[k] === 'number' && isFinite(ph[k])) live.ph[k] = ph[k];
        });
      },
      // Draw one frame synchronously — needed before canvas.toDataURL().
      // _running is cleared so this extra draw does not queue a second loop.
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
    version: '2.0.0',
    create: create,
    defaultConfig: defaultConfig,
    normalizeConfig: normalizeConfig,
    canMorph: canMorph,
    svgToIcon: svgToIcon,
    easings: EASINGS,
    STRUCTURAL_KEYS: STRUCTURAL_KEYS,
    NUM_KEYS: NUM_KEYS
  };
})(typeof window !== 'undefined' ? window : this);
