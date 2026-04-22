// ------------------------------------------------------------
// Navigation functionality
// ------------------------------------------------------------

const navLinks = document.querySelectorAll('#nav a');
const main = document.getElementById('main');
const articles = document.querySelectorAll('#main article');
const closeButtons = document.querySelectorAll('.close');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function scheduleLogoFlaps() {
  const scene = document.querySelector('.logo-scene');
  if (!scene) return;

  const rightWing = scene.querySelector('.logo-wing-wrap.right');
  if (!rightWing) return;

  let nextTimerId = null;
  let stopTimerId = null;
  let burstToken = 0;

  const clearTimers = () => {
    if (nextTimerId !== null) window.clearTimeout(nextTimerId);
    if (stopTimerId !== null) window.clearTimeout(stopTimerId);
    nextTimerId = null;
    stopTimerId = null;
  };

  const endBurst = (token) => {
    if (token !== burstToken) return; // stale callback
    scene.classList.remove('is-flapping');
    scheduleNext();
  };

  const scheduleNext = () => {
    clearTimers();
    const delayMs = randomInt(4_000, 15_000);
    nextTimerId = window.setTimeout(() => {
      const flapCount = randomInt(2, 5);
      scene.style.setProperty('--flap-count', String(flapCount));

      // Start a fresh burst. Bump token so any previous callbacks become no-ops.
      burstToken += 1;
      const token = burstToken;

      // Restart animation deterministically.
      scene.classList.remove('is-flapping');
      void scene.offsetWidth;
      scene.classList.add('is-flapping');

      rightWing.addEventListener(
        'animationend',
        () => endBurst(token),
        { once: true }
      );

      // Fallback stop condition (handles background tab throttling / missed animationend).
      const speedStr = getComputedStyle(rightWing).animationDuration;
      const speedMs = speedStr.endsWith('ms')
        ? parseFloat(speedStr)
        : parseFloat(speedStr) * 1000;
      const totalMs = Math.max(1, speedMs) * flapCount + 200;
      stopTimerId = window.setTimeout(() => endBurst(token), totalMs);
    }, delayMs);
  };

  scheduleNext();
}

// ------------------------------------------------------------
// Ripple overlay functionality
// ------------------------------------------------------------

function initRippleOverlay() {
  const svg = document.getElementById('ripple-svg');
  if (!svg) return null;

  const container = svg.closest('.ripple-layer');
  if (!container) return null;

  const SVG_NS = 'http://www.w3.org/2000/svg';

  const RINGS = [
    { dots: 6, ringR: 28, dotR: 2.2 },
    { dots: 9, ringR: 44, dotR: 3.0 },
    { dots: 13, ringR: 62, dotR: 3.9 },
    { dots: 15, ringR: 83, dotR: 5.0 },
    { dots: 20, ringR: 106, dotR: 6.2 },
    { dots: 29, ringR: 134, dotR: 7.8 },
  ];

  // Timing tweaks (easy to adjust)
  const RIPPLE_DURATION = 1200; // ms (base ripple animation timing)
  const RIPPLE_EXTRA_VISIBLE_MS = 600; // ms (keep ripple visible longer)
  const RIPPLE_FADE_IN_MS = 400; // ms
  const RIPPLE_FADE_OUT_MS = 800; // ms
  const RIPPLE_STROKE_OPACITY = 0.32;
  const RIPPLE_STROKE_WIDTH = 2.6;
  const RIPPLE_DOUBLE_OFFSET = 300; // ms

  const randomPause = () => 2000 + Math.random() * 8000; // 2–10 seconds
  const retryDelayMs = 750;

  const size = () => {
    const r = container.getBoundingClientRect();
    const w = Math.max(0, Math.round(r.width));
    const h = Math.max(0, Math.round(r.height));
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    return { w, h };
  };

  let currentInsts = [];
  let nextTimerId = null;
  let paused = false;

  function createInstance(startDelayMs = 0) {
    const { w, h } = size();
    if (w < 200 || h < 140) return null;

    const cx = 80 + Math.random() * (w - 160);
    const cy = 40 + Math.random() * (h * 0.9 - 80);
    // Scale tuning:
    // - Increase min/max by 60% (vs original 0.55–1.10)
    // - Then shrink overall by 20% so rings render smaller overall
    // Final range: (0.55–1.10) * 1.6 * 0.8 = 0.704–1.408
    const minScale = 0.55 * 1.6 * 0.8;
    const maxScale = 1.1 * 1.6 * 0.8;
    const scale = minScale + Math.random() * (maxScale - minScale);

    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('transform', `translate(${cx},${cy}) scale(${scale})`);

    const ringGroups = [];

    RINGS.forEach((ring) => {
      const rg = document.createElementNS(SVG_NS, 'g');
      rg.setAttribute('opacity', '0');

      for (let d = 0; d < ring.dots; d++) {
        const angle = (2 * Math.PI * d) / ring.dots - Math.PI / 2;
        const x = Math.cos(angle) * ring.ringR;
        const y = Math.sin(angle) * ring.ringR;
        const circle = document.createElementNS(SVG_NS, 'circle');
        circle.setAttribute('cx', String(x));
        circle.setAttribute('cy', String(y));
        circle.setAttribute('r', String(ring.dotR));
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', 'white');
        circle.setAttribute('stroke-opacity', String(RIPPLE_STROKE_OPACITY));
        circle.setAttribute('stroke-width', String(RIPPLE_STROKE_WIDTH));
        rg.appendChild(circle);
      }

      g.appendChild(rg);
      ringGroups.push(rg);
    });

    svg.appendChild(g);

    return { g, ringGroups, startTime: performance.now() + startDelayMs };
  }

  const RIPPLE_TOTAL_DURATION = RIPPLE_DURATION + RIPPLE_EXTRA_VISIBLE_MS;

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function smoothstep01(t) {
    const x = clamp01(t);
    return x * x * (3 - 2 * x);
  }

  function envelopeOpacity(t) {
    // 0..1 fade in, hold, 1..0 fade out across the total ripple lifetime.
    const fadeIn = Math.max(0, RIPPLE_FADE_IN_MS);
    const fadeOut = Math.max(0, RIPPLE_FADE_OUT_MS);
    const total = Math.max(1, RIPPLE_TOTAL_DURATION);

    if (t < 0 || t > total) return 0;
    if (fadeIn > 0 && t < fadeIn) return smoothstep01(t / fadeIn);
    if (fadeOut > 0 && t > total - fadeOut) return smoothstep01((total - t) / fadeOut);
    return 1;
  }

  function getRingOpacity(ringIndex, t) {
    // Two soft pulses (out + back) for the ring, then apply a global fade envelope
    // to avoid the "pop in/out" feel.
    const HALF = RIPPLE_DURATION * 0.45;
    const SPREAD = 85;
    const outPeak = (ringIndex / 5) * HALF;
    const backPeak = RIPPLE_DURATION - (ringIndex / 5) * HALF;
    const gaussA = Math.exp(-0.5 * Math.pow((t - outPeak) / SPREAD, 2));
    const gaussB = Math.exp(-0.5 * Math.pow((t - backPeak) / SPREAD, 2));
    return Math.min(1, gaussA + gaussB) * envelopeOpacity(t);
  }

  function clearInstances() {
    currentInsts.forEach((inst) => inst.g.remove());
    currentInsts = [];
  }

  function spawnCycle() {
    clearInstances();
    if (paused) return;

    const count = Math.random() < 0.5 ? 1 : 2;
    const inst1 = createInstance(0);
    if (inst1) currentInsts.push(inst1);

    if (count === 2) {
      const inst2 = createInstance(RIPPLE_DOUBLE_OFFSET);
      if (inst2) currentInsts.push(inst2);
    }
  }

  function scheduleNext() {
    if (nextTimerId !== null) window.clearTimeout(nextTimerId);
    if (paused) return;

    const pause = randomPause();
    nextTimerId = window.setTimeout(() => {
      spawnCycle();
      scheduleNext();
    }, currentInsts.length === 0 ? retryDelayMs : RIPPLE_TOTAL_DURATION + pause);
  }

  function animate(now) {
    if (currentInsts.length > 0) {
      currentInsts.forEach((inst) => {
        const elapsed = now - inst.startTime;
        inst.ringGroups.forEach((rg, ri) => {
          const op = elapsed >= 0 && elapsed < RIPPLE_TOTAL_DURATION ? getRingOpacity(ri, elapsed) : 0;
          rg.setAttribute('opacity', String(op));
        });
      });
    }
    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', () => {
    size();
  });

  function pauseRipples() {
    paused = true;
    if (nextTimerId !== null) window.clearTimeout(nextTimerId);
    nextTimerId = null;
    clearInstances();
  }

  function resumeRipples() {
    if (!paused) return;
    paused = false;
    spawnCycle();
    scheduleNext();
  }

  spawnCycle();
  scheduleNext();
  requestAnimationFrame(animate);

  return { pause: pauseRipples, resume: resumeRipples };
}

// ------------------------------------------------------------
// Show article functionality
// ------------------------------------------------------------

let rippleController = null;

function resumeRipplesAfterClose() {
  if (!rippleController) return;
  window.setTimeout(() => rippleController && rippleController.resume(), 350);
}

function showArticle(id) {
  const targetArticle = document.getElementById(id + '-content');

  // Hide all articles
  articles.forEach((article) => {
    article.style.display = 'none';
  });

  // Show target article
  if (targetArticle) {
    targetArticle.style.display = 'block';
    main.classList.add('active');
    document.body.classList.add('modal-open');
    if (rippleController) rippleController.pause();
  }
}

// Handle clicks on nav links
navLinks.forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = link.getAttribute('href').substring(1);
    window.location.hash = target; // Update URL hash
    showArticle(target);
  });
});

// Close functionality
closeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    main.classList.remove('active');
    document.body.classList.remove('modal-open');
    window.location.hash = ''; // Clear hash
    setTimeout(() => {
      articles.forEach((article) => {
        article.style.display = 'none';
      });
    }, 325);
    resumeRipplesAfterClose();
  });
});

// Close on background click
main.addEventListener('click', (e) => {
  if (e.target === main) {
    main.classList.remove('active');
    document.body.classList.remove('modal-open');
    window.location.hash = '';
    setTimeout(() => {
      articles.forEach((article) => {
        article.style.display = 'none';
      });
    }, 325);
    resumeRipplesAfterClose();
  }
});

// ESC key to close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && main.classList.contains('active')) {
    main.classList.remove('active');
    document.body.classList.remove('modal-open');
    window.location.hash = '';
    setTimeout(() => {
      articles.forEach((article) => {
        article.style.display = 'none';
      });
    }, 325);
    resumeRipplesAfterClose();
  }
});

// Handle internal links between articles
document.querySelectorAll('.internal-link').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = link.getAttribute('href').substring(1);
    window.location.hash = target;
    showArticle(target);
  });
});

// Show article if URL has a hash on page load
window.addEventListener('DOMContentLoaded', () => {
  const hash = window.location.hash.substring(1);
  if (hash) {
    main.classList.add('no-transition');
    showArticle(hash);
    requestAnimationFrame(() => {
      main.classList.remove('no-transition');
    });
  }

  scheduleLogoFlaps();
  rippleController = initRippleOverlay();
});


// ------------------------------------------------------------
// Contact form functionality
// ------------------------------------------------------------

const form = document.getElementById('contact-form');

form.addEventListener('submit', function (e) {
  e.preventDefault();

  grecaptcha.ready(function () {
    grecaptcha
      .execute('6Lf_nFArAAAAAAckh8n-KBDpXEaf4dL21gQN1MqA', { action: 'submit' })
      .then(function (token) {
        document.getElementById('recaptcha-response').value = token;

        const formData = new FormData(form);

        fetch('https://formspree.io/f/xkgbwbaj', {
          method: 'POST',
          body: formData,
          headers: {
            Accept: 'application/json',
          },
        })
          .then((response) => {
            if (response.ok) {
              alert('Thank you! Your message has been sent.');
              form.reset();
            } else {
              alert('Oops! There was a problem. Please try again.');
            }
          })
          .catch((error) => {
            alert('An error occurred. Please try again later.');
          });
      });
  });
});
