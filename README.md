# Carwash Marketplace - The Ultimate Car Wash Marketplace

This is a Next.js application built with React, ShadCN UI, Tailwind CSS, and Genkit. It is designed as a production-ready frontend prototype for a car wash marketplace in Botswana.

## 🚀 How to push to GitHub

Since you have already initialized git and committed your files locally, follow these steps to push to a remote repository:

1.  **Create a new repository** on [GitHub](https://github.com/new).
    *   Give it a name (e.g., `carwash-marketplace`).
    *   **Do not** initialize it with a README, license, or gitignore (since you already have them).
2.  **Copy the Remote URL** from the "Quick setup" page on GitHub (it looks like `https://github.com/YOUR_USERNAME/carwash-marketplace.git`).
3.  **Run these commands** in your terminal here:

```bash
# 1. Add the remote origin (replace the URL with yours)
git remote add origin https://github.com/YOUR_USERNAME/carwash-marketplace.git

# 2. Rename the branch to main (if not already)
git branch -M main

# 3. Push your code to GitHub
git push -u origin main
```

## Project Structure

- `src/app`: Next.js App Router pages and layouts for Customer, Business Owner, and Admin roles.
- `src/components`: Reusable UI components built with ShadCN and Tailwind.
- `src/ai`: Genkit AI flows for intelligent service recommendations and descriptions.
- `src/lib`: Mock APIs, types, and utility functions simulating a real backend.

## Development

Run the development server:
```bash
npm run dev
```

Run Genkit UI for AI testing:
```bash
npm run genkit:dev
```

## Key Features

- **Personalized Dashboards**: Tailored views for Customers, Business Owners, and Admins.
- **AI Recommender**: Intelligent service suggestions based on car condition and preferences.
- **Mobile Tracking**: Real-time simulation of mobile car wash service progress.
- **Earnings Oversight**: Mocked financial views using Botswana Pula (P).
