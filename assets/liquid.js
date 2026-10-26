/* 液态玻璃：背景流体场、指针高光、主题切换、滚动进度
   无依赖，约 8KB。所有效果在 prefers-reduced-motion 下静止。 */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduce = reduceQuery.matches;

  function currentTheme() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  /* ---------------------------------------------------------------------- */
  /* 1. the field: a slow liquid shader behind the page                     */
  /* ---------------------------------------------------------------------- */
  var field = (function () {
    var canvas = document.getElementById("field-canvas");
    if (!canvas) return { setTheme: function () {} };

    var gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power"
    }) || canvas.getContext("experimental-webgl");

    if (!gl) {
      canvas.style.display = "none";
      return { setTheme: function () {} };
    }

    var VERT = [
      "attribute vec2 a;",
      "void main() { gl_Position = vec4(a, 0.0, 1.0); }"
    ].join("\n");

    var FRAG = [
      "#ifdef GL_FRAGMENT_PRECISION_HIGH",
      "precision highp float;",
      "#else",
      "precision mediump float;",
      "#endif",
      "uniform vec2 uRes;",
      "uniform float uTime;",
      "uniform vec3 uC0;",
      "uniform vec3 uC1;",
      "uniform vec3 uC2;",
      "uniform vec3 uGlow;",
      "uniform float uDark;",
      "uniform float uScroll;",
      "float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }",
      "float noise(vec2 p) {",
      "  vec2 i = floor(p); vec2 f = fract(p);",
      "  vec2 u = f * f * (3.0 - 2.0 * f);",
      "  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),",
      "             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);",
      "}",
      "float fbm(vec2 p) {",
      "  float v = 0.0; float a = 0.5;",
      "  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; }",
      "  return v;",
      "}",
      "void main() {",
      "  vec2 uv = gl_FragCoord.xy / uRes;",
      "  float aspect = uRes.x / uRes.y;",
      "  vec2 p = vec2(uv.x * aspect, uv.y) * 2.7;",
      "  float t = uTime * 0.03 + uScroll * 0.00055;",
      "  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, -t * 0.7)));",
      "  vec2 r = vec2(fbm(p * 1.75 + q * 1.25 + vec2(1.7, 9.2) + t * 0.5),",
      "                fbm(p * 1.75 + q * 1.25 + vec2(8.3, 2.8) - t * 0.4));",
      "  float f = fbm(p * 1.2 + r * 2.0);",
      "  vec3 col = mix(uC0, uC1, smoothstep(0.10, 0.74, f));",
      "  col = mix(col, uC2, smoothstep(0.22, 0.88, r.x * 0.62 + f * 0.46));",
      "  float fil = abs(f - 0.5);",
      "  col += uGlow * smoothstep(0.045, 0.0, fil) * 0.045 * uDark;",
      "  float detail = noise(p * 6.5 + r * 1.3);",
      "  float amt = mix(0.06, 0.14, uDark);",
      "  col *= (1.0 - amt * 0.5) + amt * detail;",
      "  float d = length((uv - vec2(0.12, 0.95)) * vec2(aspect, 1.0) * 1.2);",
      "  col += uGlow * smoothstep(1.0, 0.0, d) * (0.10 + 0.16 * uDark);",
      "  float vig = smoothstep(0.30, 1.30, length((uv - 0.5) * vec2(aspect, 1.0)));",
      "  col *= 1.0 - vig * (0.24 + 0.22 * uDark);",
      "  col += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * 0.018;",
      "  gl_FragColor = vec4(col, 1.0);",
      "}"
    ].join("\n");

    function compile(type, source) {
      var shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    var vs = compile(gl.VERTEX_SHADER, VERT);
    var fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      canvas.style.display = "none";
      return { setTheme: function () {} };
    }

    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      canvas.style.display = "none";
      return { setTheme: function () {} };
    }
    gl.useProgram(program);

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(program, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(program, "uRes");
    var uTime = gl.getUniformLocation(program, "uTime");
    var uC0 = gl.getUniformLocation(program, "uC0");
    var uC1 = gl.getUniformLocation(program, "uC1");
    var uC2 = gl.getUniformLocation(program, "uC2");
    var uGlow = gl.getUniformLocation(program, "uGlow");
    var uDark = gl.getUniformLocation(program, "uDark");
    var uScroll = gl.getUniformLocation(program, "uScroll");

    var palettes = {
      dark: {
        c0: [0.008, 0.020, 0.034],
        c1: [0.022, 0.135, 0.155],
        c2: [0.145, 0.065, 0.270],
        glow: [0.28, 0.82, 0.75],
        dark: 1
      },
      light: {
        c0: [0.968, 0.972, 0.976],
        c1: [0.775, 0.905, 0.915],
        c2: [0.885, 0.845, 0.965],
        glow: [0.99, 1.0, 1.0],
        dark: 0
      }
    };

    var width = 0;
    var height = 0;
    var raf = 0;
    var active = false;
    var elapsed = 0;
    var last = 0;

    function applyTheme(theme) {
      var p = palettes[theme] || palettes.dark;
      gl.uniform3fv(uC0, p.c0);
      gl.uniform3fv(uC1, p.c1);
      gl.uniform3fv(uC2, p.c2);
      gl.uniform3fv(uGlow, p.glow);
      gl.uniform1f(uDark, p.dark);
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      var h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (w === width && h === height) return false;
      width = w;
      height = h;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
      return true;
    }

    function draw() {
      gl.uniform1f(uTime, elapsed);
      gl.uniform1f(uScroll, window.scrollY || 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function frame(now) {
      if (!active) return;
      if (last) elapsed += Math.min(now - last, 100) / 1000;
      last = now;
      draw();
      raf = window.requestAnimationFrame(frame);
    }

    function play() {
      if (active || reduce) return;
      active = true;
      last = 0;
      raf = window.requestAnimationFrame(frame);
    }

    function pause() {
      active = false;
      last = 0;
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    }

    function renderOnce(t) {
      resize();
      gl.uniform1f(uTime, t);
      gl.uniform1f(uScroll, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    applyTheme(currentTheme());
    resize();
    renderOnce(0);

    if (!reduce) {
      play();
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) pause();
        else play();
      });
    }

    var resizeTimer = 0;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        resize();
        if (!active) renderOnce(0);
      }, 160);
    });

    canvas.addEventListener("webglcontextlost", function (event) {
      event.preventDefault();
      pause();
    });

    canvas.addEventListener("webglcontextrestored", function () {
      applyTheme(currentTheme());
      resize();
      renderOnce(0);
      play();
    });

    var onMotionChange = function (event) {
      reduce = event.matches;
      if (reduce) {
        pause();
        renderOnce(0);
      } else {
        play();
      }
    };

    if (reduceQuery.addEventListener) reduceQuery.addEventListener("change", onMotionChange);
    else if (reduceQuery.addListener) reduceQuery.addListener(onMotionChange);

    return {
      setTheme: function (theme) {
        applyTheme(theme);
        if (!active) renderOnce(0);
      }
    };
  })();

  /* ---------------------------------------------------------------------- */
  /* 2. theme                                                               */
  /* ---------------------------------------------------------------------- */
  var toggle = document.querySelector(".theme-toggle");
  var themeMeta = document.querySelector('meta[name="theme-color"]');

  function paintTheme(theme) {
    root.setAttribute("data-theme", theme);
    if (themeMeta) themeMeta.setAttribute("content", theme === "light" ? "#e9eff3" : "#050b10");
    if (toggle) {
      toggle.setAttribute("aria-label", theme === "light" ? "切换到深色主题" : "切换到浅色主题");
      toggle.setAttribute("title", theme === "light" ? "切换到深色主题" : "切换到浅色主题");
    }
    field.setTheme(theme);
  }

  paintTheme(currentTheme());

  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = currentTheme() === "light" ? "dark" : "light";
      try { window.localStorage.setItem("glass-theme", next); } catch (error) { /* private mode */ }
      paintTheme(next);
    });
  }

  /* ---------------------------------------------------------------------- */
  /* 3. header state                                                        */
  /* ---------------------------------------------------------------------- */
  var header = document.querySelector(".site-header");
  var ticking = false;

  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 12);
    updateProgress();
    ticking = false;
  }

  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(onScroll);
  }, { passive: true });

  window.addEventListener("resize", function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(onScroll);
  }, { passive: true });

  /* ---------------------------------------------------------------------- */
  /* 4. reading progress                                                    */
  /* ---------------------------------------------------------------------- */
  var bar = document.getElementById("progress-bar");

  function updateProgress() {
    if (!bar) return;
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    bar.style.width = (ratio * 100).toFixed(2) + "%";
  }

  /* ---------------------------------------------------------------------- */
  /* 5. pointer specular on glass                                           */
  /* ---------------------------------------------------------------------- */
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)");

  if (fine.matches && !reduce) {
    var lit = null;
    var pending = null;
    var queued = false;

    function applyPointer() {
      queued = false;
      var event = pending;
      if (!event) return;
      var target = event.target && event.target.closest ? event.target.closest(".glass") : null;
      if (target !== lit) {
        if (lit) lit.classList.remove("is-lit");
        lit = target;
        if (lit) lit.classList.add("is-lit");
      }
      if (lit) {
        var rect = lit.getBoundingClientRect();
        lit.style.setProperty("--mx", (event.clientX - rect.left).toFixed(0) + "px");
        lit.style.setProperty("--my", (event.clientY - rect.top).toFixed(0) + "px");
      }
    }

    document.addEventListener("pointermove", function (event) {
      pending = event;
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(applyPointer);
    }, { passive: true });

    document.addEventListener("pointerdown", function (event) {
      pending = event;
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(applyPointer);
    }, { passive: true });

    document.addEventListener("pointerleave", function () {
      if (lit) lit.classList.remove("is-lit");
      lit = null;
    });
  }

  /* ---------------------------------------------------------------------- */
  /* 6. reveal on scroll                                                    */
  /* ---------------------------------------------------------------------- */
  var reveals = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window && !reduce) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });

    Array.prototype.forEach.call(reveals, function (el) {
      observer.observe(el);
    });
  } else {
    Array.prototype.forEach.call(reveals, function (el) {
      el.classList.add("is-in");
    });
  }

  onScroll();
})();
