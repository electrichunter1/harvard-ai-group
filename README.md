# Harvard AI Group website

Review draft for the Harvard AI Group website. The live draft is served from `main` → `/docs` on GitHub Pages.

Edit the site under `src/`. Build the Pages files with Node.js, then commit the source and generated `docs/` together.

```sh
node build.mjs --pages-base /harvard-ai-group/
```

For a local site at the root of a static server, run `node build.mjs` and serve `dist/`.

## Private member and board portal

The portal is a separate Cloudflare Worker backed by D1. The public Pages site reads approved event, project, and profile updates from a read-only feed. Share the [private sign-in URL](https://harvard-ai-group-portal.buzznguyen.workers.dev/portal/) directly with authorized members. The public navigation has no portal link.

| Role | What they can do |
| --- | --- |
| Member | Propose a public profile or project, see the status of their own requests, and withdraw pending requests. |
| Board | Review and edit requests before publishing, and create, edit, or archive events, projects, and profiles. |
| Owner | Manage the member and board roster and perform board actions. |

### Activate the portal

1. Use the Cloudflare account that will own the club’s portal. Enable a Workers subdomain and Zero Trust if the account still needs them. In `portal/`, run `npm ci` and sign in with `npx cf auth login`.
2. Create a dedicated D1 database with `npx cf d1 create --name harvard-ai-group-portal`. Apply the schema with `npx cf d1 migrations apply <database-uuid> --dir ./migrations`.
3. Create a [self-hosted Access application](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/) for `harvard-ai-group-portal.<workers-subdomain>.workers.dev/portal`, with a short session such as one hour. Allow the owner’s verified address plus the club’s approved identity provider or Harvard address domains. Require [independent MFA](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/independent-mfa/) for this application, preferably security keys. The Worker validates the signed token for this exact Access application and checks each signed-in address against its own roster on every portal request.
4. Set these environment variables in the shell running `npx cf deploy`. Keep account values out of Git. Run `npx cf deploy --dry-run` before the actual deployment.

   | Variable | Value |
   | --- | --- |
   | `HAG_D1_ID` | D1 database UUID |
   | `HAG_ACCESS_ISSUER` | Access team origin, such as `https://team.cloudflareaccess.com` |
   | `HAG_ACCESS_AUD` | Access application audience tag |
   | `HAG_OWNER_EMAIL` | One verified owner address |
   | `HAG_PORTAL_ORIGIN` | HTTPS origin of the Worker, without a trailing slash |

5. Verify that the portal requires Access sign-in and denies signed-in accounts without a portal role. Check that `/public/content?kind=project` responds anonymously and contains only published entries. Sign in as the owner, assign the initial roles, and verify a member request plus a board publication before inviting the broader club.
6. From the repository root, rebuild the Pages site and commit the generated output. The build already uses the current production feed. To point it to a new deployment, set the origin explicitly and update the default in `build.mjs`.

   ```sh
   node build.mjs --pages-base /harvard-ai-group/ --portal-origin https://harvard-ai-group-portal.<workers-subdomain>.workers.dev
   ```

### Maintenance

Board members can use the workspace for day-to-day event, project, and profile updates. General site copy, program schedules, layout, and photos are maintained under `src/`. Existing entries built into Pages remain in the repository’s public history. Archiving one in the workspace removes it from the live catalog when the feed is reachable. If an old entry should also disappear from the static fallback, remove it from the source and rebuild.

Run `npm test` in `portal/` on supported Node.js 24 to verify token validation, role separation, request privacy, and publication. Run the deployment dry run with the account values set to verify the Worker bundle.
