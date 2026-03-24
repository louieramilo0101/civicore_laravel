# Fix Directory Listing → Landing Page
Status: Update for dir listing issue

## Steps:
- [x] 1. Stop XAMPP (ports free)
- [x] 2. Laragon started (Apache green)
- [ ] 3. `npm run dev` (Vite :5173 running)
- [ ] 4. Edit C:\Windows\System32\drivers\etc\hosts (Admin): add `127.0.0.1 civicore_laravel.test`
- [ ] 5. Visit **http://civicore_laravel.test** (NOT localhost/)
- [ ] 6. F12 Console/Network no errors, assets from :5173
- [ ] 7. Hard refresh Ctrl+Shift+R
- [ ] 8. Prod: `npm run build`
- [x] 9. Landing appears (React <Landing />)

Troubleshoot: Dir listing = wrong URL (localhost). Use .test vhost → public/index.php → app.blade.php → #root → React.


