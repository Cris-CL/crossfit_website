import { defineConfig } from 'vite';

const removeCssCrossorigin = {
  name: 'remove-css-crossorigin',
  transformIndexHtml(html) {
    return html.replace(/<link rel="stylesheet" crossorigin/g, '<link rel="stylesheet"');
  },
};

export default defineConfig({
  plugins: [removeCssCrossorigin],
  root: '.',

  publicDir: 'public',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // ── Main pages ──────────────────────────────────────────────
        index:               'index.html',
        about:               'about.html',
        access:              'access.html',
        career:              'career.html',
        coach:               'coach.html',
        contact:             'contact.html',
        dropin:              'dropin.html',
        facility:            'facility.html',
        hyrox:               'hyrox.html',
        'hyrox-performance': 'hyrox-performance.html',
        'hyrox-strength':    'hyrox-strength.html',
        plan:                'plan.html',
        privacy:             'privacy.html',
        schedule:            'schedule.html',
        spartan:             'spartan.html',
        trial:               'trial.html',

        // ── Utility ─────────────────────────────────────────────────
        '404':     '404.html',

        // ── New booking pages (add entries here as pages are created) ──
        'booking-trial':              'booking-trial.html',
        'booking-dropin':             'booking-dropin.html',
        'booking-hyrox-competitors':  'booking-hyrox-competitors.html',
        'booking-hyrox-strength':     'booking-hyrox-strength.html',
        'booking-spartan':            'booking-spartan.html',
        'booking-foundation':         'booking-foundation.html',
        // 'admin-credits':              'admin-credits.html',
        'contact-thanks':             'contact-thanks.html',
        'career-thanks':              'career-thanks.html',
      },
    },
  },

  server: {
    port: 5173,
    proxy: {
      // Proxy /api/* to the Firebase Functions emulator
      // Production: Firebase Hosting rewrite handles /api/** → apiV2 function
      // Dev: Vite proxies to the local functions emulator
      '/api': {
        target: 'http://127.0.0.1:5001/crossfitwebsite/us-central1/apiV2',
        changeOrigin: true,
      },
    },
  },
});
