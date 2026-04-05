# Project 7: NASA API - Space Explorer App
NASA releases a new "Astronomy Picture of the Day" (APOD) every day—spotlighting breathtaking images of galaxies, stars, planets, and more.

Your task is to build an interactive web app that fetches and displays these photos using [NASA's API](https://api.nasa.gov/). Users will pick a date range and instantly view stunning photos from across the cosmos, along with titles and descriptions.

You'll get to use your skills to build something that's actually connected to real-world data from one of the most iconic organizations in the world.

## API key and GitHub

For a **public repo** or **GitHub Pages**, use NASA’s built-in demo API key so you never expose a personal key. In `js/config.js`, keep:

`const NASA_API_KEY = 'DEMO_KEY';`

That value is [documented by NASA](https://api.nasa.gov/) for demos; rate limits are lower than with your own key. To develop locally with higher limits, [sign up for a free key](https://api.nasa.gov/) and set `NASA_API_KEY` to that string **only on your machine**—do not commit a private key to GitHub.

## Starter Files
- The provided files include a NASA logo, date inputs, a button, a placeholder for your gallery, and basic layout and styling to help you get started.
- It also includes built-in logic (in `dateRange.js`) to handle the valid APOD date range—from June 16, 1995 to today. No need to modify it.
- All your custom JavaScript should go in `script.js`. That's where you'll write the code that fetches data and displays your gallery.
