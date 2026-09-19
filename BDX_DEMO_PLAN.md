# BDX / AVX / RX — an independent demo of the module architecture

**Status 2026-09-19: BUILT AND WORKING.** Repo
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

### Setting it up, when the machine exists

Written now so it is not reconstructed later. `rx.butterflydreaming.org` is the
natural name; the DNS is already at Hostinger.

    # 1. DNS: an A record  rx.butterflydreaming.org -> the VPS IP

    # 2. Node 20 (Ubuntu)
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs nginx
    node -v

    # 3. The relay
    sudo git clone https://github.com/wrcstewart/bdx-demo /opt/rx
    cd /opt/rx && sudo npm install --omit=dev

    # 4. Run it as a service, on LOOPBACK only — nginx is the front door
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

    # 5. nginx. THE UPGRADE HEADERS ARE THE PART PEOPLE MISS — without them
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

    # 6. TLS. The pages are on HTTPS (GitHub Pages), so the relay MUST be too
    #    or the browser blocks it as mixed content.
    sudo apt-get install -y certbot python3-certbot-nginx
    sudo certbot --nginx -d rx.butterflydreaming.org

    # 7. Check
    curl https://rx.butterflydreaming.org/health

Then set `DEFAULT_RX` in `bdx.html` and `avx.html` to that origin and push, and
the published pages work on click.

**Why TLS is not optional here:** the pages are served over HTTPS, and a browser
will not let an HTTPS page open a plain `ws://` socket. Testing against
`http://localhost` works only because browsers make a special exception for
localhost.

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

## 9. Decisions outstanding

- **Buy the KVM1 and run §6**, then set `DEFAULT_RX` in both pages and push.
- Whether `bdx-demo` is the right public name. It says what it proves rather
  than what it does; `kolam-live` would say the opposite. Cheap to change now,
  awkward once linked to.
- Whether to add a QR / short-code path for cross-device pairing. Designed in
  `AV/README.md`, entirely controller-side, NOT built. Deliberately out of scope
  for this demo: the multi-device transport is a separate job.

## 10. The one thing not to get wrong

Only the controller can MINT a token, because a token derives its meaning from a
session. A viewer only ever CONSUMES one. Any design where "AVX gives BDX a
token" is backwards and will not work — see `AV/README.md`, *Another device*.
