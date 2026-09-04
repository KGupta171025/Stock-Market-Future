# GitHub Pages Deployment Guide

This project is fully configured and ready for automated deployment on **GitHub Pages**.

---

## 🚀 Deployment Options

### Option 1: Automatic Deployment via GitHub Actions (Recommended)

The repository includes a GitHub Actions workflow at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Configure project for GitHub Pages deployment"
   git push origin main
   ```

2. **Enable GitHub Pages in your Repository Settings**:
   - Go to your repository on GitHub: `https://github.com/KGupta171025/app` (or your repository URL)
   - Click **Settings** (tab at the top)
   - In the left sidebar, click **Pages**
   - Under **Build and deployment**:
     - **Source**: Select **GitHub Actions**
   - That's it! Every time you push to `main`, GitHub Actions will build and deploy your app automatically.

---

### Option 2: Manual Deployment via `gh-pages` Branch

You can also deploy manually using the `deploy` script:

```bash
cd frontend
yarn deploy
```
*(or `npm run deploy`)*

Then in GitHub **Settings -> Pages**:
- **Source**: Select **Deploy from a branch**
- **Branch**: Select `gh-pages` / `/ (root)`
- Click **Save**

---

## 🌐 Live Backend & Demo Mode

- **Standalone / Demo Mode**: When running on GitHub Pages without a backend, the application automatically uses intelligent, high-fidelity simulated market data, OHLCV candles, technical indicators, LSTM & Transformer predictions, news sentiment, and AMFI mutual funds.
- **Guest / Demo Login**: Evaluators can click **"Instant Guest / Demo Access"** on the login page to immediately test the platform without needing Firebase authentication.
- **Live Backend Connection**: To connect to a live FastAPI backend:
  - Deploy the backend (`server.py`) to any platform (Render, Railway, Fly.io, or VPS).
  - In GitHub Repository **Settings -> Secrets and variables -> Actions -> Variables**:
    - Add variable: `REACT_APP_BACKEND_URL` with value `https://your-backend-api.com`
