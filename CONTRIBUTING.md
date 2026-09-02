# Contributing to Bakaiti

Thank you for contributing to Bakaiti! To maintain software quality and zero disruption to the live production app, please follow our Git branch workflow.

## 🌿 Branching Workflow

We maintain two primary deployment branches connected to Vercel:

- `main`: **Production Branch** (Deploys live to squad members).
- `staging`: **Staging & Integration Branch** (Deploys to Vercel Preview URL for testing).

### How to Contribute a Feature or Bug Fix

1. **Checkout `staging`**:
   ```bash
   git checkout staging
   git pull origin staging
   ```
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit Your Changes**:
   Follow conventional commits:
   - `feat: add nickname support`
   - `fix: resolve message reaction counter`
   - `style: refine light mode theme`

4. **Push & Create Pull Request to `staging`**:
   ```bash
   git push -u origin feature/your-feature-name
   ```
5. **Verify on Vercel Preview**:
   Vercel will post a preview URL in your PR. Test all features (chat real-time, audio, AI commands) on the preview build.

6. **Merge into `main`**:
   Once verified on `staging`, merge `staging` into `main` to trigger the production deployment.

## 🧪 Code Quality & Verification

Before submitting a PR or merging, run local build validation:

```bash
npm run build
```

Ensure there are no TypeScript compilation errors or broken imports.
