// Navigation functionality
const navLinks = document.querySelectorAll('#nav a');
const main = document.getElementById('main');
const articles = document.querySelectorAll('#main article');
const closeButtons = document.querySelectorAll('.close');

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
