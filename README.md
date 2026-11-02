# SportsGuard Quote Journey

A production-ready static multi-step quote flow for SportsGuard / Protected Life.

## Features

- Five-step quote journey plus final confirmation page
- Client-side input validation for date of birth and contact details
- Step gating to prevent users from skipping required earlier steps
- Accessible labels and live error regions
- Direct FLG API lead submission from the browser

## Project Structure

- index.html (entrypoint redirect)
- step1.html
- step2.html
- step3.html
- step4.html
- step5.html
- step6.html (legacy redirect to step5)
- complete.html
- assets/js/app.js

## Run Locally

Open index.html in your browser.

For best results, use a local static server.

```bash
python3 -m http.server 8080
```

Then visit http://localhost:8080

## Deploy To GitHub Pages

1. Create a new GitHub repository.
2. Upload all files in this folder.
3. In GitHub, open Settings > Pages.
4. Under Build and deployment, choose Deploy from a branch.
5. Select branch main and folder /(root), then Save.
6. Wait for the deployment to complete and open the generated URL.

## Notes

- Local browser state is used for the step journey and confirmation display.
- The FLG API key is currently in frontend code for easy static deployment.
- If you later want better security, move FLG submission behind a backend endpoint.
