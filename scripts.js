// ------------------------------------------------------------
// Navigation functionality
// ------------------------------------------------------------

const navLinks = document.querySelectorAll('#nav a');
const main = document.getElementById('main');
const articles = document.querySelectorAll('#main article');
const closeButtons = document.querySelectorAll('.close');

// Animations live in `animations.js` (loaded before this file).

// (Logo flaps + ripple overlay implementation moved to `animations.js`.)

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

  const anim = window.ConcordiaAnimations ? window.ConcordiaAnimations.init() : null;
  rippleController = anim ? anim.rippleController : null;
});


// ------------------------------------------------------------
// Contact form functionality
// ------------------------------------------------------------

const form = document.getElementById('contact-form');
const RECAPTCHA_SITE_KEY = '6LcOKtIsAAAAALlbrsGwein3JMAsM8xFPOX7K9PH';

window.submitContactForm = function submitContactForm() {
  if (!form) return;

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
    .catch(() => {
      alert('An error occurred. Please try again later.');
    });
};

if (form) {
  form.addEventListener('submit', function (e) {
    // Let reCAPTCHA's button handler invoke `onSubmit(token)` (defined in index.html).
    // We only prevent native submission so the page doesn't reload.
    e.preventDefault();

    // Fallback: if Enterprise didn't auto-run (blocked script/adblock), attempt programmatic execution.
    if (window.grecaptcha?.enterprise?.execute) {
      window.grecaptcha.enterprise
        .execute(RECAPTCHA_SITE_KEY, { action: 'submit' })
        .then(function (token) {
          const tokenInput = document.getElementById('recaptcha-response');
          if (tokenInput) tokenInput.value = token;
          window.submitContactForm && window.submitContactForm();
        });
    }
  });
}
