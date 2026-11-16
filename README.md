# Harvard AI Group website

Review draft for the Harvard AI Group website. The live draft is served from `main` → `/docs` on GitHub Pages.

Edit the site under `src/`. Build the Pages files with Node.js, then commit the source and generated `docs/` together.

```sh
node build.mjs --pages-base /harvard-ai-group/
```

For a local site at the root of a static server, run `node build.mjs` and serve `dist/`.

## Private member and board portal

The portal is a separate Cloudflare Worker backed by D1. The public Pages site reads approved event, paper, project, profile, and page copy updates from read-only endpoints. Share the [private sign-in URL](https://harvard-ai-group-portal.buzznguyen.workers.dev/portal/) directly with authorized members. The public navigation has no portal link.

The [interactive portal demo](https://electrichunter1.github.io/harvard-ai-group/portal-demo/) uses fictional accounts for all four roles. Its state lives in the open tab and clears on reload.

| Role | What they can do |
| --- | --- |
| Member | Submit requests for projects, papers, events, profiles, or fellowship. Track their own requests and withdraw pending ones. |
| Board | Review website requests and create, edit, and publish projects, papers, events, and profiles. |
| Website manager | Perform board actions, edit page copy, delete or restore catalog entries, and manage the account roster. Only the primary Website manager can grant or revoke the Website manager role. |
| Fellow manager | Review fellowship proposals and approve or decline them privately. Edit Fellowship page copy. |

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
   | `HAG_OWNER_EMAIL` | Verified email of the primary Website manager |
   | `HAG_PORTAL_ORIGIN` | HTTPS origin of the Worker, without a trailing slash |

5. Verify that the portal requires Access sign-in and denies signed-in accounts without a portal role. Check that `/public/content?kind=project` responds anonymously and contains only published entries. Sign in as the primary Website manager, assign the initial roles, and verify that website and fellowship requests reach their respective reviewers.
6. From the repository root, rebuild the Pages site and commit the generated output. The build already uses the current production feed. To point it to a new deployment, set the origin explicitly and update the default in `build.mjs`.

   ```sh
   node build.mjs --pages-base /harvard-ai-group/ --portal-origin https://harvard-ai-group-portal.<workers-subdomain>.workers.dev
   ```

### Maintenance

Board members can use the workspace for day-to-day event, paper, project, and profile updates. Website managers can edit the main page introductions and key program text through **Website copy**. Layout, photos, and the detailed Bootcamp schedule are maintained under `src/`. Deleting an entry removes it from the live catalog and keeps a private copy for Website managers to restore. Entries built into Pages also exist in the static fallback and public repository history. To remove an old entry from the static fallback, remove it from the source and rebuild.

### Database management

- Cloudflare D1 stores the approved account roster, requests, publications, and page copy in separate tables. Website managers control the roster. Cloudflare Access handles sign-in and MFA. The Worker verifies the signed Access token and checks the caller’s role on each portal request. The portal stores no passwords or MFA secrets.
- The Worker uses parameterized SQL. Fellowship decisions update only private requests. Publishing a website request writes the public entry and updates the request status in one transaction. The anonymous endpoints read only published content and copy.
- Indexes support account lookup, member request history, both pending review queues, and the public catalog. GitHub Pages serves the public site independently of the database and loads publication and copy updates in the background.
- Cloudflare D1 automatically encrypts data in transit and at rest. It also maintains point-in-time recovery through Time Travel. [D1 data security](https://developers.cloudflare.com/d1/reference/data-security/), [D1 backups](https://developers.cloudflare.com/d1/reference/time-travel/).

Run `npm test` in `portal/` on supported Node.js 24 to verify token validation, role separation, request privacy, and publication. Run the deployment dry run with the account values set to verify the Worker bundle.
