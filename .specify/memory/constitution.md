# AI Engineer Resume Static Web App Constitution

## Core Principles

### I. Static-First Delivery
The application must be buildable and deployable as a static web app. Pages and content should be pre-rendered at build time unless a clear user requirement demands runtime behavior.

### II. Resume Content Clarity
The site must clearly present AI Engineer profile content: summary, skills, projects, experience, education, and contact links. Content must be easy to scan on desktop and mobile.

### III. Accessibility Baseline
Each page must use semantic HTML, keyboard-accessible navigation, sufficient text contrast, and descriptive alt text for non-decorative images.

### IV. Performance Baseline
Pages should be lightweight and fast by default: optimized images, minimal client-side JavaScript, and no unnecessary third-party scripts.

### V. Simplicity and Maintainability
Prefer simple architecture and minimal dependencies. Add complexity only when it directly improves resume quality or user experience.

## Technical Constraints

- Framework: Next.js static export compatible setup.
- Styling: Consistent design tokens for spacing, typography, and color.
- Content source: Local, version-controlled files.
- Hosting target: Static web app hosting environment.

## Delivery Workflow

- Keep pages and components small, readable, and reusable.
- Validate locally that the app builds and static output is generated.
- For each change, confirm responsive layout and accessibility basics before merge.

## Governance

This constitution is the default standard for all feature, plan, and task decisions in this repository. Any exception must be documented in the related spec with rationale and scope. Amendments require a direct update to this file and alignment of dependent templates and plans.

**Version**: 1.0.0 | **Ratified**: 2026-04-01 | **Last Amended**: 2026-04-01
