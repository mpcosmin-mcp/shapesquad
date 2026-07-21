# ShapeSquad — Google Apps Script backend

The Sheet's read/write logic lives in Google, not in this repo. `Code.gs` is the
source of truth — keep it in sync with what's deployed.

## Why you may need to (re)deploy this

If measurements logged from the app **don't appear in the Sheet**, the deployed
`doPost` is the cause. The old handler read form params (`e.parameter.*`) while
the app POSTs a JSON body (`e.postData.contents`), so writes were dropped.
`Code.gs` here reads JSON correctly and **upserts by `Nume` + `Date`** (edit =
update the row, add = append) — which also powers the editable table on `/log`.

## Deploy steps

1. Google Sheet → **Extensions → Apps Script**.
2. Paste the contents of [`Code.gs`](./Code.gs) over the existing code. **Save**.
3. **Deploy → Manage deployments →** edit the existing Web App deployment →
   **Version: New version → Deploy**.
   - Keep the **same deployment** so the `/exec` URL the app calls doesn't change.
   - **Execute as:** Me · **Who has access:** Anyone.
4. (Optional) If your data lives on a specific tab, set `SHEET_NAME` at the top
   of `Code.gs`. Empty = first sheet.

The `/exec` URL is referenced in `app/api/data/route.ts` and
`app/api/submit/route.ts`. It only changes if you create a *new* deployment.

## Log password (separate from this)

Writing is gated by a server-side password. Set `LOG_PASSWORD` in
**Vercel → Settings → Environment Variables** (and in `.env.local` for local
dev). It's verified in `app/api/log/verify` and `app/api/submit` and never ships
to the browser. See [`.env.example`](../.env.example).

Pick a **new** value — the old password was hardcoded in the source and remains
visible in git history, so treat it as compromised.
