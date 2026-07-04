# Agent Notes

This is a Void app-mode boilerplate with React pages and Void-managed Better Auth.

- Use `bun run dev` for local development.
- Run `bun run check` before pushing.
- Auth is enabled by `void.json` and client calls use `auth` from `void/client`.
- Protected server routes should use `requireAuth` from `void/auth`.
- Keep Porio source sync separate from Void deploy: `bun run sync:push` updates the Porio app files, while `bun run deploy` deploys to Void Cloud.
