# HydroFlow Pro - The Ultimate Car Wash Marketplace

This is a Next.js application built with React, ShadCN UI, Tailwind CSS, and Genkit.

## How to connect to GitHub

To push your code to GitHub, follow these steps in your terminal:

1.  **Create a new repository** on [GitHub](https://github.com/new). Do not initialize it with a README, license, or gitignore.
2.  **Initialize Git** in your local project folder:
    ```bash
    git init
    ```
3.  **Add all files** to the staging area:
    ```bash
    git add .
    ```
4.  **Commit the changes**:
    ```bash
    git commit -m "Initial commit of HydroFlow Pro"
    ```
5.  **Rename the default branch** to `main`:
    ```bash
    git branch -M main
    ```
6.  **Add the remote repository** (replace `<YOUR_GITHUB_URL>` with the URL from GitHub):
    ```bash
    git remote add origin <YOUR_GITHUB_URL>
    ```
7.  **Push your code**:
    ```bash
    git push -u origin main
    ```

## Project Structure

- `src/app`: Next.js App Router pages and layouts.
- `src/components`: Reusable UI components (ShadCN).
- `src/ai`: Genkit AI flows for recommendations and descriptions.
- `src/lib`: Mock APIs, types, and utility functions.

## Development

Run the development server:
```bash
npm run dev
```

Run Genkit UI for AI testing:
```bash
npm run genkit:dev
```
