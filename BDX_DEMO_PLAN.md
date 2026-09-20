# BDX / AVX / RX — an independent demo of the module architecture

**Status 2026-09-19: BUILT AND WORKING IN ALL THREE BROWSERS.** Repo
<https://github.com/wrcstewart/bdx-demo>, pages at
<https://wrcstewart.github.io/bdx-demo/>. Verified end to end with the
published pages driving a viewer through a relay running locally — the claim
demonstrated. Remaining: deploy RX (§6) and point the pages at it.

It also found a real bug in BD's own shim, which is a fair argument for having
built it: `controllerOrigin` (`540dd8a`). A viewer asked its opener for a
replacement token and aimed the request at the RELAY's origin — invisible in
BD, where the relay and the opener are the same window.
Written down before building because the reasoning matters more than the code,
and the code is easy to rebuild from it.

---

## 1. What this is, and the argument it makes

Three small things, hosted away from ButterflyDreaming, that together drive a
live Kolam from a script — proving that **the module architecture needs nothing
of BD**: no Memgraph, no corpus, no graph, no nodes, no cards, no pairing, no
curation, no speech.

| | what it is | where it runs |
|---|---|---|
| **BDX** | the controller: a script panel, steppers, and the renderer | GitHub Pages (static) |
| **AVX** | the viewer: renders what it is told, no controls | GitHub Pages (static) |
| **RX**  | the relay: a rendezvous for two browsers on different devices | a Node host |

The claim it supports: *a third party can build a media module for BD, or use
this architecture entirely on their own, without depending on us.*

## 2. The dependency ladder — what actually needs a server

This is the heart of it, and the thing to state carefully because it is easy to
overclaim in either direction.

1. **Same machine → NO SERVER AT ALL.** If the controller OPENED the viewer, it
   holds a window handle and `postMessage` reaches it — cross-origin included.
   Measured in `AV/README.md`: **~1 ms, against ~30 ms through a socket.**
   BDX on their site and AVX on GitHub Pages can talk directly.
2. **Cross-device → a rendezvous is unavoidable.** Two browsers on two devices
   cannot reach each other; a window handle does not exist. Something in the
   middle must exist. That is RX, and it is the ONLY reason the socket path
   exists in BD at all.
3. **Whose rendezvous** is then a free choice: run RX yourself (~10 lines to
   start, no account), or point at ours for a demo.

So: the architecture does not require *our* server. It requires *a* server, and
only for the cross-device case. Say it that way.

## 3. What already exists

- **`bd_relay.js`** — BUILT (`bf70980`). 198 lines, the whole relay, free of BD.
  `server.js` calls it; `rx.js` will run it standalone.
- **`AV/bd_av_client.js`** — the viewer shim. This is the third-party contract.
- **`AV/kolam.html`** — the reference viewer; the template for AVX.
- **`V_Kolam/preview.html`** — *already a BDX*: script panel, steppers, renderer,
  on a URL, no corpus. Built as the frozen standalone. The template for BDX.
- **`V_Kolam/visual_module.html`** — the renderer. The demo needs a copy.

## 4. What to build

    rx.js            ~10 lines around bd_relay.js. process.env.PORT, a /health
                     route, CORS '*'. socket.io its only dependency.
    package.json     one dependency, a start script.
    bdx.html         script panel + steppers + renderer iframe + a View button.
    avx.html         viewer + the health strip + a way back.
    bd_av_client.js  COPY of the shim — this is the artifact a third party uses.
    renderer.html    COPY of visual_module.html.
    sync_from_bd.sh  refreshes both copies, so the copying is deliberate.
    README.md        the three tiers, how to run RX, how to point at another.

## 5. The divergence risk, and how each copy is handled

This repository has already lost this argument twice: two copies of
`music_module.html` diverged, and the frozen Kolam standalone has drifted FOUR
ways from the live renderer (angle 5..90, no angle_minutes, step capped at 200,
colour shown as the exponent). A published copy rots.

- **The relay is a MODULE, never copied.** One implementation, two entry points.
  This is why part 1 was done first.
- **The shim and the renderer must be copies**, because the demo has to stand
  alone — that is the entire point of it. So the copying is made *deliberate*:
  a `sync_from_bd.sh` that refreshes them, and a header in each naming its
  source and the date. A copy that announces itself is survivable; one that
  pretends to be original is not.

## 6. Hosting — decided 2026-09-19: a Hostinger KVM1

A small VPS rather than a free PaaS. Hetzner was the value pick and was not
available; **Hostinger KVM1** keeps billing and DNS with the existing account,
and is ample — RX is one Node process using tens of megabytes.

**NOT the existing Hostinger VPS**, which runs the Discourse forum. Discourse
owns 80/443 through its own containerised nginx, so adding a proxy there means
changing a working forum's request path for the sake of a 103-line service.
Not worth the risk; a second machine is a few pounds a month.

### Confirmed 2026-09-20

| | |
|---|---|
| plan | **KVM2** — 2 cores, 8 GB, 1000 GB NVMe, 8 TB. Chosen over KVM1 for the second core, which makes it usable as a build machine rather than only a host. RX itself does not need it: **measured at 67 MB resident and 0% CPU idle after 21 hours**, with 5.7 MB of dependencies. |
| OS | Ubuntu 24.04 LTS |
| hostname | **rx.butterflydreaming.org** |
| certbot email | wrcstewart@yahoo.co.uk |
| access | key-only. The Mac's existing `~/.ssh/id_ed25519` public half is added at creation, so no password is ever handled. |

**DNS state before the work:** `rx.butterflydreaming.org` does not resolve.
`butterflydreaming.org` points at GitHub Pages (185.199.108-111.153) for the
landing page — adding an A record for the `rx` subdomain does not disturb it.

### Setting it up, when the machine exists

Written now so it is not reconstructed later.

    # 1. DNS: an A record  rx.butterflydreaming.org -> the VPS IP

    # 2. A swap file and a firewall, before anything else.
    #    Swap because a box with none OOM-KILLS rather than slowing down, and
    #    that is an unpleasant way to discover a leak in a later experiment.
    sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
    sudo mkswap /swapfile && sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443
    sudo ufw --force enable
    sudo apt-get update && sudo apt-get install -y unattended-upgrades

    # 3. Node 20 (Ubuntu)
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs nginx
    node -v

    # 4. The relay
    sudo git clone https://github.com/wrcstewart/bdx-demo /opt/rx
    cd /opt/rx && sudo npm install --omit=dev

    # 5. Run it as a service, on LOOPBACK only — nginx is the front door
    sudo tee /etc/systemd/system/rx.service >/dev/null <<'UNIT'
    [Unit]
    Description=RX relay
    After=network.target
    [Service]
    WorkingDirectory=/opt/rx
    Environment=PORT=8081
    ExecStart=/usr/bin/node rx.js
    Restart=always
    User=www-data
    [Install]
    WantedBy=multi-user.target
    UNIT
    sudo systemctl enable --now rx && sudo systemctl status rx

    # 6. nginx. THE UPGRADE HEADERS ARE THE PART PEOPLE MISS — without them
    #    the polling handshake works, the WebSocket upgrade fails, and the
    #    symptom is "it works but it is slow", which is hard to attribute.
    sudo tee /etc/nginx/sites-available/rx >/dev/null <<'CONF'
    server {
      listen 80;
      server_name rx.butterflydreaming.org;
      location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 7d;      # a socket may be idle a long time
      }
    }
    CONF
    sudo ln -s /etc/nginx/sites-available/rx /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx

    # 7. TLS. The pages are on HTTPS (GitHub Pages), so the relay MUST be too
    #    or the browser blocks it as mixed content.
    sudo apt-get install -y certbot python3-certbot-nginx
    sudo certbot --nginx -d rx.butterflydreaming.org

    # 8. Check
    curl https://rx.butterflydreaming.org/health

Then set `DEFAULT_RX` in `bdx.html` and `avx.html` to that origin and push, and
the published pages work on click.

**Why TLS is not optional here:** the pages are served over HTTPS, and a browser
will not let an HTTPS page open a plain `ws://` socket. Testing against
`http://localhost` works only because browsers make a special exception for
localhost.

## 6c. DEPLOYMENT IN PROGRESS — 2026-09-20

**Decision changed: RX goes on the EXISTING Hostinger VPS beside Discourse**,
not a second machine. It saves a whole subscription, and the earlier caution
was about the wrong thing.

**The risk was never the install — it was the INGRESS.** Node, a clone and a
service on 8081 touch nothing Discourse owns. What was dangerous was taking
port 80 from Discourse's container for certbot, which means editing
`containers/app.yml`, rebuilding, and moving TLS. A **cloudflared tunnel needs
none of that**: it dials OUT and holds the connection open, so no port is
opened, no nginx exists, no certificate is issued on the box, and Discourse's
request path is never touched. Cloudflare terminates TLS, which also kills the
Safari mixed-content problem.

**Hostname is `rx.virtualfictions.uk`, NOT rx.butterflydreaming.org.** Only
`virtualfictions.uk` is on Cloudflare nameservers; `butterflydreaming.org` is
on Hostinger's (dns-parking). A tunnel requires the zone to be on Cloudflare.
It also sits beside `graph.virtualfictions.uk`, which is how BD already
reaches the world.

### The machine, surveyed before touching it

    2 cores · 7.8 GB RAM · 96 GB disk at 15% · Ubuntu 24.04.4
    Discourse `app` container up 4 months, owning 80/443 via docker-proxy
    no swap, no Node, no cloudflared, no host nginx, ufw inactive
    monarx-agent on 127.0.0.1:65529 — Hostinger's own agent, left alone

### Done

- **2 GB swap.** There was none, and a box with none OOM-kills rather than
  slowing down.
- **Node v20.20.2.** Installed only — NO blanket `apt upgrade`, which is the
  one command that could disturb Docker.
- **`/opt/rx`**, cloned, `npm ci --omit=dev`, 20 packages, 6 MB.
- **`rx.service`**, hardened: `www-data`, `ProtectSystem=strict`,
  `PrivateTmp`, `NoNewPrivileges`, writes only to `/opt/rx`.
- **Bound to 127.0.0.1**, verified unreachable from outside.
- **cloudflared installed**, not yet authorised.

### NOT done, deliberately

**`ufw` is NOT enabled**, against the generic §6. `ufw` and Docker interact
badly — Docker writes its own iptables rules, and enabling a firewall on a
Discourse box either breaks published ports or gives false confidence. It is
also unnecessary: the tunnel opens nothing.

### Found and fixed at the source: RX_HOST

`rx.js` called `server.listen(PORT)` with no host, so on a public IP it
listened on EVERY interface. Nothing was exposed — confirmed, the provider
filters non-standard ports inbound — but that is luck, not design. `RX_HOST`
now exists and is documented; the service sets it to `127.0.0.1`.

### Remaining — needs the author at a browser

1. `cloudflared tunnel login` → it prints a URL, the author opens it and
   picks `virtualfictions.uk`. **The link times out in minutes, so do not
   start this until they are at the keyboard.**
2. `cloudflared tunnel create rx` and route `rx.virtualfictions.uk` to it.
3. Install cloudflared as a service.
4. Verify `https://rx.virtualfictions.uk/health`.
5. Set `DEFAULT_RX` in `bdx.html` and `avx.html`, push, confirm the hosted
   demo works on click — INCLUDING Safari, which this is what finally fixes.

**Alternative to step 1** if a browser flow is awkward: create the tunnel in
the Cloudflare dashboard instead and use the token —
`cloudflared service install <token>`. Same result, and the dashboard works
from a phone.

### DONE — verified 2026-09-20

All five steps above are complete. Live at `https://rx.virtualfictions.uk`.

**WebSocket crosses the tunnel.** Proven, not assumed: a raw Engine.IO v4
client spoke `wss://rx.virtualfictions.uk/socket.io/?EIO=4&transport=websocket`
— no polling, no upgrade — and got the open packet back, while `/health` held
`"transports":{"websocket":1}`. So the tunnel forwards a real WebSocket and
nothing silently degrades to long-polling. `curl`'s HTTP/2 400 on an upgrade
attempt is NOT evidence either way: curl offers an HTTP/2 connection, where
the HTTP/1.1 Upgrade mechanism does not exist. Test with a WebSocket client.

### What `/health` counts, and why zero is usually right

`sessions` counts sockets that have completed the Socket.IO **namespace**
connect — the `40` packet, not the HTTP handshake. Between the two it reports
zero, correctly. It is live, never cached: watch `uptime_s` climb.

**A relay reporting `sessions:0` while the demo plainly works means the demo
is on a DIFFERENT relay.** This happened, and cost a round of debugging aimed
at the wrong component. Two ways in:

- The page is served from localhost, so it targets `localhost:8081` by design.
- **`STORED_RX`** — a `?rx=` typed once lives in `localStorage`, per browser,
  and **outranks `DEFAULT_RX` for ever after**. The PUBLIC page will keep
  talking to a relay on the developer's own desk, looking perfect.

Checking `/health` from another browser cannot reveal either: a different
browser has a different `localStorage` and was never the thing connected. The
fix is that **BDX's header now names the host it reached**, beside the
transport — `relay: rx.virtualfictions.uk (websocket)`. It was already in the
`title` attribute, which is a tooltip: invisible on a phone, unread on a
desktop by anyone not already suspicious.

This bites hardest on §9a: a stored `localhost` URL **cannot be reached by the
device you send to**, and the failure will look like the other device's fault.

## 6a. How the pages find a relay

- **BDX + AVX**: GitHub Pages. Static, free, always up.
  Live at <https://wrcstewart.github.io/bdx-demo/>.
- **RX**: GitHub Pages CANNOT host it — it is a server.
- **In order of preference**: `?rx=<origin>` on the URL, then whatever was last
  typed into the relay box (localStorage), then `localhost:8081` if the page is
  itself on localhost, then the compiled-in `DEFAULT_RX`.
- **A relay box in the header**, shown only when there is none. A query string
  is a poor place for a setting every reload needs: losing it produced a page
  that drew perfectly, said nothing, and had never created a socket. Three
  rounds of debugging went into learning that.
- **RX also serves the pages** when they sit beside it, so `npm start` is the
  whole of local setup — one command, one origin, nothing to line up. A second
  static server on a second port was a step that could go wrong, and when it
  did the symptom was "no relay", which sounds like the relay's fault.

## 6b. Alternatives considered, and why not

- **Render free** — works, and `render.yaml` is still in the repo. Sleeps after
  ~15 min and takes ~50s to wake. Fine for a demo shown live, poor for a link
  posted and forgotten.
- **Hetzner CX22 (~€4)** — the value pick. Not available when needed.
- **The existing Hostinger VPS** — rejected: it runs Discourse, which owns
  80/443 through its own nginx.

## 7. Testing

Re-use the probes that verified the extraction. They drive the raw Socket.IO
polling protocol with `fetch` and need no client library:

    token single-use · type filtering · av_pull/av_state_report round trip ·
    av_return strips a destination · viewer allowlist holds

Plus, for the demo specifically: BDX drives AVX on the same machine; then on two
devices through RX; then BDX pointed at a *different* RX via `?rx=`.

## 8. Decisions taken

- **Hostinger KVM1**, a machine of its own (2026-09-19). Not the forum's VPS.
- The relay ships as a **module**, not a copy.
- The demo **defaults to our RX**, with `?rx=` to override.
- A demo that does not work on click is not convincing, so tier 1 hosting is
  worth having even though tier 3 (`node rx.js`) is what proves the argument.

## 8a. What testing found, and what it cost

Everything below was found by the author driving the real pages. None of it was
found by the probes, which speak raw Socket.IO and bypass the page code
entirely — worth remembering when the next thing is "verified".

**Three rounds lost to a silent failure.** Symptom: "no relay", with a relay log
that was completely EMPTY — the browser had never attempted a socket. Cause:
the page had been loaded without `?rx=`, because a reload drops a query string.
The reason it took three rounds is the one this project keeps re-learning: the
drawing comes from an iframe and works whether or not the page's own script is
alive, so a dead page, a waiting page and a working page look identical.

Fixed by, in order of value: the page **narrates its connection** to the console
(`[bdx] requesting… / client loaded / connected`); the relay is **typed into a
box and kept in localStorage** rather than living in a query string; and **RX
serves the pages itself**, so local setup is one command on one origin.

**The stepper→script direction was dead**, and it was my own superseded fix
carried into new code. `writePanel` tested `document.activeElement === script` —
the guard BD outgrew on 09-18. Two things made it permanent rather than
awkward: the caret stays in the panel after typing, AND the renderer's stepper
buttons call `preventDefault` on pointerdown so clicking one does not move focus
to the iframe either. Once the script had been edited, the panel never updated
again.

**The same fault has two right answers**, decided by what the element is. BD's
panel is a contentEditable div, where rewriting destroys the caret — so BD had
to separate recording from redrawing. BDX's panel is a TEXTAREA, where the
selection can be saved and restored, so the simpler "has anyone typed in the
last 1200ms" guard is correct here and would have been wrong there. Do not
"harmonise" them.

**Safari is the strict one, and earned its keep.** An https page reaching an
http relay is mixed content. Chrome and Firefox make an exception for
`localhost`; Safari does not and blocks it outright, which looks exactly like
the relay being down. **A deployed relay needs TLS for this reason** — it is
not a nicety, and §6 treats it as mandatory.

**Do not offer a control that cannot fix the fault being reported.** The relay
box appeared in the mixed-content case, where nothing typed into it could ever
work — anything is still an http relay reached from an https page. A box that
looks like the answer costs more than no box at all. It now offers a LINK to
the page the relay itself serves, which is one of the only two real remedies.

## 9. Decisions outstanding

- **Buy the KVM1 and run §6**, then set `DEFAULT_RX` in both pages and push.
  This is the next action, and it unblocks §9a.
- Whether `bdx-demo` is the right public name. It says what it proves rather
  than what it does; `kolam-live` would say the opposite. Cheap to change now,
  awkward once linked to.
- Whether to add a QR / short-code path for cross-device pairing. Designed in
  `AV/README.md`, entirely controller-side, NOT built. Deliberately out of scope
  for this demo: the multi-device transport is a separate job.

## 9a. Next, after the VPS: "Send to another device"

The author's idea, and the cheapest useful form of the QR design: BDX shows the
AVX URL in a text box with a copy button, so it can be pasted onto another
device. **It needs no new protocol** — mint a token, build the URL, display it.

A second BUTTON beside View, not a radio: both do the same thing and differ
only in what becomes of the token — one opens a window here, the other hands
you the link. A radio would imply View changes behaviour.

Three things it must get right:

- **Mint on the press, never in advance.** Single use, two-minute life. A box
  shown continuously is a dead link that looks usable.
- **One URL, one viewer.** A second device needs a second press; say so.
- **THE URL MUST NAME A HOST THE OTHER DEVICE CAN REACH.** This is the trap:
  served from `localhost:8081`, the URL means *the other device itself*. It
  must use a reachable origin — the deployed relay, or a LAN address — or say
  plainly that it only works on this machine.

**Deliberately after the VPS**, because it is barely testable before: the phone
needs to reach both the pages and the relay, and the hosted pages plus a local
http relay fail for the same mixed-content reason Safari demonstrated.

**And it is what would finally prove the premise.** Everything tested so far is
two windows on ONE MACHINE — the case that does not need a relay at all.
Cross-device is the only thing RX exists for, and it has never been done.

## 10. The one thing not to get wrong

Only the controller can MINT a token, because a token derives its meaning from a
session. A viewer only ever CONSUMES one. Any design where "AVX gives BDX a
token" is backwards and will not work — see `AV/README.md`, *Another device*.
