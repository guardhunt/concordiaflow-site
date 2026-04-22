// Navigation functionality
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
});

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
