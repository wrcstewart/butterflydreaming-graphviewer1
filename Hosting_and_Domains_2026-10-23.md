# Hosting and domains — how BD reaches the public internet

**Written 2026-10-23**, when `butterflydreaming.net` was commissioned and every
node gained a working permanent URL. Operational reference: the facts here were
all *measured* during that session, and several contradict what the dashboards
appear to say.

---

## START HERE — the shape of it

BD runs as **`node server.js` on the author's Mac, listening on `localhost:8080`**.
It reaches the internet through **one Cloudflare tunnel**, which now serves
**three hostnames** from that single origin:

| hostname | role |
|---|---|
| `graph.virtualfictions.uk` | the original address; still works |
| `butterflydreaming.net` | **the canonical public stem** as of 2026-10-23 |
| `www.butterflydreaming.net` | same, in ingress — no DNS record created yet |

Two things that are **not** BD:

- **`butterflydreaming.org`** is the **info site**, a separate GitHub Pages
  deployment from the sibling repo `wrcstewart/butterflydreaming` (its `CNAME`
  file says so). `butterflydreaming.org/n/<uuid>` returns **404**. This matters
  because `.org` is the stem written into every node's stored `url` — see below.
- **`rx.virtualfictions.uk`** is the BDX/AVX demo on the Discourse VPS, a
  different machine and a different tunnel. Nothing here affects it.

---

## The tunnel is LOCALLY MANAGED — the dashboard cannot configure it

This cost a round of wrong instructions, so it is the first thing to know.

The tunnel runs as `cloudflared tunnel run butterflydreaming` and reads its
ingress rules from **`~/.cloudflared/config.yml` on the Mac**:

```yaml
tunnel: 5e8eaf21-e707-4288-a31c-abf99852f36e
credentials-file: /Users/williamstewart2/.cloudflared/5e8eaf21-e707-4288-a31c-abf99852f36e.json

ingress:
  - hostname: graph.virtualfictions.uk
    service: http://localhost:8080
  - hostname: butterflydreaming.net
    service: http://localhost:8080
  - hostname: www.butterflydreaming.net
    service: http://localhost:8080
  - service: http_status:404
```

**Consequence:** Zero Trust → Networks → Tunnels shows this tunnel's
*connections* but offers **no Public Hostname / Service fields**, because those
belong to dashboard-managed tunnels. Hunting for a "Service" field there is
hunting for something that cannot exist. **To add a hostname, edit that file.**

Rules are matched **in order** and `http_status:404` is the catch-all, so a new
hostname goes **above** it. `cloudflared tunnel ingress validate` checks the
file, and `cloudflared tunnel ingress rule <url>` says which rule a given URL
would hit — both are local and need no network.

### Restarting it without dropping the site

**Nothing supervises the process** — no launchd plist, no `launchctl` entry;
it sits at PPID 1 because it was started with `nohup` from a terminal that has
since gone. So it does **not** come back by itself after a reboot or a failed
start, and whoever kills it owns bringing it back.

The zero-downtime method, used on 2026-10-23: **start the new instance first,
let it register, then SIGTERM the old one.** One tunnel can hold several
replicas and Cloudflare load-balances across their connections, so the site
stays up throughout. Measured: `graph.virtualfictions.uk` answered **HTTP 200 in
105 ms** across the swap.

It now writes to `~/.cloudflared/cloudflared.log` (`--logfile`), which it never
did before — the old instance logged nowhere.

**Outstanding:** a launchd job, so the tunnel survives a reboot. Not done.

---

## `cert.pem` is scoped to ONE zone, and `route dns` will guess wrong

`~/.cloudflared/cert.pem` is a 282-byte **ARGO TUNNEL TOKEN** — base64 JSON
holding `zoneID`, `accountID` and an `apiToken`. Its `zoneID` is
**`virtualfictions.uk`** and nothing else.

So `cloudflared tunnel route dns butterflydreaming butterflydreaming.net` did
not fail. It **succeeded in the wrong zone**, reading the argument as a
subdomain of the only zone its token knows and creating:

```
butterflydreaming.net.virtualfictions.uk   CNAME → …cfargotunnel.com
```

That stray record was deleted by hand. **For any zone other than
`virtualfictions.uk`, create the DNS record in the dashboard instead** — or
re-run `cloudflared tunnel login` and pick the other zone, which overwrites
`cert.pem` (harmless to the running tunnel, which authenticates with the
credentials JSON, not this file).

---

## The DNS record: PROXIED is mandatory, not a preference

For the apex, one record only:

| field | value |
|---|---|
| Type | `CNAME` |
| Name | `@` |
| Target | `5e8eaf21-e707-4288-a31c-abf99852f36e.cfargotunnel.com` |
| Proxy | **Proxied** (orange cloud) |

**Why the proxy is not optional**, measured: `<tunnel-id>.cfargotunnel.com`
returns **`ANSWER: 0`** — it does not exist in public DNS. It is a name only
Cloudflare's own edge understands. Grey-cloud that record and Cloudflare hands
the name straight to the visitor's resolver, which finds nothing: the site is
**dead**, not merely unaccelerated. `cloudflared tunnel route dns` creates these
records proxied and offers no alternative.

The dashboard shows the Type as **Tunnel** once it recognises the target. A
proxied apex CNAME is **flattened**, so a `CNAME` query returns nothing and the
apex answers with Cloudflare anycast A/AAAA records instead. That is correct and
not a sign of a leftover A record.

---

## Two false alarms, both diagnosed by headers

Between adding the record and the site working, `butterflydreaming.net` spent
hours answering `302 → https://graph.virtualfictions.uk/`. Two different causes
wore the same symptom, and **one header separated them every time**:

```
server: hcdn        → Hostinger answered; not our configuration at all
server: cloudflare  → ours (and always accompanied by a cf-ray)
```

**Cause 1 — the zone was Pending.** While Cloudflare had not activated the zone,
Hostinger's CDN still held the hostname at the edge and served the old parked
redirect. Nothing of ours was mis-set: a wrong setting in *our* zone would still
have been answered by Cloudflare. Note that Hostinger's own panel says
*"Redirects only work with Hostinger nameservers"* — so the redirect was already
orphaned, which is exactly why the original **plan to redirect `.net` → the
tunnel was abandoned**: Hostinger's forwarder also **drops the path**, verified
twice, so `/n/<uuid>` arrived as bare `/` and the node id was lost. A redirect
can never carry an id.

**Cause 2 — a stale local resolver, which looked identical.** After activation,
the site worked from everywhere *except* the author's own house. The router at
`192.168.178.1` (a FRITZ!Box) held Hostinger's old address and **re-cached it
with a fresh 1800-second TTL**, so it renewed rather than expiring:

```
dig +short butterflydreaming.net                     → 2.57.91.91       (stale)
dig +short butterflydreaming.net @1.1.1.1 / @8.8.8.8 → 104.21.25.170 …  (correct)
dig +short butterflydreaming.net @hera.ns…           → the same         (authoritative)
```

The TTL *rising* between two observations is the tell: the record had been
re-fetched, so the staleness was upstream of the router, not merely in it.
Rebooting the router would have cleared its own cache and then re-fetched the
same answer.

**Why Safari worked while Firefox and Chrome did not:** Safari was going through
**iCloud Private Relay**, which resolves names itself and bypasses the router;
the other two use the system resolver.

**The lesson worth keeping: `--resolve` is the diagnostic.**
`curl --resolve host:443:<authoritative-ip>` bypasses every cache between you
and the edge, and was how the site was verified correct while the author's own
browsers still showed the redirect. Note that in **zsh an unquoted `$VAR` does
not word-split**, so `curl $OPTS` passes the whole thing as one argument and
fails with "option … is unknown" — write the flag out or use an array.

---

## Verification suite

Run after any change to the tunnel, the zone, or the server routes. Substitute a
real node uuid.

```sh
U=e3e498aa-3ff5-4276-af0a-6d82a4872d09
H=butterflydreaming.net

# marker headers — want: 200, server: cloudflare, a cf-ray, DYNAMIC
curl -sI "https://$H/" | grep -iE '^(HTTP/|server|cf-ray|cf-cache-status)'

# a node URL: 200 with ZERO redirects, and the path intact
curl -s -o /dev/null -w "%{http_code} redirects:%{num_redirects} %{url_effective}\n" \
     -L "https://$H/n/$U"

# the view flag survives
curl -s -o /dev/null -w "%{http_code} %{url_effective}\n" -L "https://$H/n/$U?view=1"

# a malformed id must 404 (server.js guards the uuid shape)
curl -s -o /dev/null -w "%{http_code}\n" "https://$H/n/garbage"

# the four absolute assets — all 200, or the app is blank at a sub-path
for a in /style.css /viewer.js /module_wire_tables.js /speech_lexicon.json; do
  curl -s -o /dev/null -w "%{http_code} $a\n" "https://$H$a"; done

# Socket.IO: pairing and the relay die silently without this
curl -s "https://$H/socket.io/?EIO=4&transport=polling" | head -c 120

# viewer.js MUST be BYPASS — a cached copy would defeat the canary
curl -sI "https://$H/viewer.js" | grep -iE '^(cf-cache-status|cache-control)'
```

Measured baseline, 2026-10-23: all pass on both hostnames. HTML `DYNAMIC`,
`viewer.js` **BYPASS** (origin `no-store` is respected, so the edge does not
cache the one file the canary certifies), Socket.IO handshaking with
`upgrades: ["websocket"]`.

---

## Zone settings worth comparing between the two domains

`butterflydreaming.net` was created with Cloudflare's defaults while
`virtualfictions.uk` is months old. The settings that would bite BD specifically:

1. **Network → WebSockets: ON.** BD is Socket.IO. Without it, ordinary pages
   look fine while pairing and the relay die.
2. **Caching → nothing that overrides origin headers.** That `BYPASS` above is
   the origin's `no-store` being honoured. A cache rule ignoring it would serve
   a stale `viewer.js` from the edge — reintroducing, at the edge, exactly the
   staleness the canary exists to catch.
3. **Speed → Rocket Loader OFF.** It rewrites script loading and can break a
   module-type `<script>`.
4. **Security → Bot Fight Mode off.** It challenges unusual clients, and a
   Quest's browser is exactly that.

Checked 2026-10-23: the working zone shows plain default behaviour, so there is
probably nothing custom to match.

**Cloudflare's Trace tool** (replay a request through the zone's config) is the
right instrument for *"is a rule I forgot about intercepting this?"* — an empty
rule list is the good answer. It cannot tell you whether the origin answered,
because it traces Cloudflare's decision path and never reaches the tunnel.

---

## Permanent node URLs — `/n/<uuid>`

Built 2026-10-23. **The id is not new**: every node has carried
`url: 'butterflydreaming.org/n/<uuid>'` since the MM1 migration — see
`URL_PREFIX` in `bd_tool.js`, the create handlers in `server.js`,
`migrate_mm1.js` and `apply_mm.js`. What was missing was anything that *served*
that shape.

- **`server.js`** has `app.get('/n/:uuid', …)`, guarding the uuid shape (a
  malformed id 404s rather than booting a blank app) and returning `index.html`
  with the uuid left in the address bar.
- **`viewer.js`** resolves it against `cy` at arrival and writes it back as you
  read — see `MEMORY.md` → the permanent-node-URLs note for the client design.
- **Matched on the PATH, never the host.** `.org` is stored, `.net` and
  `graph.virtualfictions.uk` serve, and all three name the same node. **Nothing
  rewrites the stored `url`** — it is identity, and a migration "correcting" the
  stem would break every link in the wild to fix a cosmetic mismatch. A stored
  `url` must therefore never be shown to anyone as a clickable link; links are
  built from `location.origin`.

**Coverage, measured:** TextNode 218/218, Cluster 128/128, Family 46/46,
HelperMessage 5/5, Entry 3/3, Root 1/1. The 84 nodes with no `url` carry only
timestamps and no label — these are the url-less orphan edge endpoints already
on record (42 edges × 2), and are not navigable.

**Why the stem is cosmetic but the length is not.** `DeepLinking.md` measured
Apple's data detector at **659 characters** for any link *clicked* in Messages,
Mail or Notes, against a **median 1,042** for BD's old state links — so the
median link silently lost its payload and opened the default script. A node URL
is **68–71 characters**, nine times under that ceiling, which is why the state
link was retired as a user-facing product on the same day.

---

## Open items

- **launchd for `cloudflared`** — it currently dies on reboot and nothing brings
  it back. Same question for `node server.js` (also PPID 1).
- **`www.butterflydreaming.net`** is in ingress but has **no DNS record**; the
  name does not resolve.
- **Whether `.org` should serve node URLs too**, so the promise is kept on the
  domain that makes it. Would mean putting `.org` on Cloudflare and routing only
  `/n/*` to the tunnel, leaving the GitHub Pages site on everything else.
- **The public read/write split**, before these URLs are published widely:
  `curationCodeOk()` is the one gate, and **every tunnel visitor arrives as
  `127.0.0.1`**, so nothing can be granted by address.
- **`/private/tmp/bd_server.log` is 31 MB** and only grows.
