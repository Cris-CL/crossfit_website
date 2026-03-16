import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',

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
        success:   'success.html',

        // ── Legacy booking pages (will be superseded by new booking pages) ──
        'dropin-booking':            'dropin-booking.html',
        'dropin-reserve':            'dropin-reserve.html',
        'hyrox-booking':             'hyrox-booking.html',
        'hyrox-performance-booking': 'hyrox-performance-booking.html',
        'hyrox-strength-booking':    'hyrox-strength-booking.html',
        'spartan-booking':           'spartan-booking.html',
        'spartan-reserve':           'spartan-reserve.html',
        'spartan3':                  'spartan3.html',
        'trial-booking':             'trial-booking.html',
        'trial-reserve':             'trial-reserve.html',

        // ── New booking pages (add entries here as pages are created) ──
        // 'booking-trial':              'booking-trial.html',
        // 'booking-dropin':             'booking-dropin.html',
        // 'booking-hyrox-competitors':  'booking-hyrox-competitors.html',
        // 'booking-hyrox-strength':     'booking-hyrox-strength.html',
        // 'booking-spartan':            'booking-spartan.html',
        // 'admin-credits':              'admin-credits.html',
        // 'contact-thanks':             'contact-thanks.html',
        // 'career-thanks':              'career-thanks.html',
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
