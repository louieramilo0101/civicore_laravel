<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/png" href="/logo.png">
<title>Civil Registry of Naic - Certificate Management System</title>
    
    <!-- External Libraries -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Lexend:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <!-- Anti-FOUC Theme & Accessibility Initializer -->
    <script>
        (function() {
            try {
                const theme = localStorage.getItem('civicore_theme') || 'system';
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (theme === 'dark' || (theme === 'system' && prefersDark)) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }

                const fontScale = localStorage.getItem('civicore_font_scale');
                if (fontScale === 'large') document.documentElement.classList.add('font-scale-lg');
                if (fontScale === 'xlarge') document.documentElement.classList.add('font-scale-xl');

                if (localStorage.getItem('civicore_contrast') === 'true') {
                    document.documentElement.classList.add('high-contrast');
                }
                if (localStorage.getItem('civicore_dyslexia') === 'true') {
                    document.documentElement.classList.add('dyslexia-font');
                }
                if (localStorage.getItem('civicore_reduced_motion') === 'true') {
                    document.documentElement.classList.add('reduced-motion');
                }
            } catch(e) {}
        })();
    </script>
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.jsx'])
</head>
<body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
</body>
</html>
