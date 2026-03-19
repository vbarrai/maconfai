---
name: update-build-size-badge
description: Triggered when the user asks about the build size, bundle size, or output size. Builds the project and updates the build size badge in README.md.
---

# Update Build Size Badge

Whenever the user asks about the build size (e.g. "what's the build size?", "how big is the bundle?", "check build size"), build the project and update the badge in `README.md`.

## Steps

1. Run `pnpm build` and capture the output
2. Extract the build size from the output line matching the pattern `X kB min+gzipped` (look for a number followed by `kB` and `min+gzipped`)
3. Report the build size to the user
4. In `README.md`, find the line matching `![Build Size]` and replace the badge URL with:
   ```
   ![Build Size](https://img.shields.io/badge/build%20size-{size}%20kB%20min%2Bgzip-blue)
   ```
   where `{size}` is the extracted size (e.g. `90.8`). URL-encode any spaces as `%20` and `+` as `%2B`.
5. If the badge value changed, commit the change directly to the current branch with message `chore: update build size badge to {size} kB`.
6. If the badge value did not change, just report the current build size.
