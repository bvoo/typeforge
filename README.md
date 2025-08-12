This was a quick project created to demonstrate understanding of high-security high-compliance environments, where this service would theoretically pass a SOC2 Type II audit.

It's built with Next, Postgres, and Typescript. You can find a hosted instance at https://web-production-6de0.up.railway.app/ (for now).

Data is encrypted at rest with AES-256-GCM. I've also implemented RBAC, timed deletion, versioning, drafts, archives, and more.
