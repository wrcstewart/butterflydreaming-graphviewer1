/*
 * bd_av_client.js — the client shim for an Ancillary Viewer (AV).
 *
 * WHAT AN AV IS
 * -------------
 * A presentation surface. BD designs the experience and holds the state; an AV
 * renders it on more screen with fewer controls. It is NOT an editor: there is
 * no return channel here, and nothing an AV does reaches the BD database.
 *
 * This file is the reference implementation. A third party building their own
 * AV can copy it unchanged — the only thing that differs is where their page is
 * hosted, and that does not matter, because BD's Socket.IO server accepts any
 * origin (server.js, the `cors` option). Nothing of theirs needs to live in
 * BD's repo or on BD's machine.
 *
 * HOW IT CONNECTS
 * ---------------
 * BD mints a Module Session Token (MST) and opens the viewer with it in the
 * URL:  https://your-host/your-viewer.html?t=<token>
 *
 * The token is SHORT-LIVED and SINGLE-USE. It exists only to bootstrap one
 * socket. It cannot be passed through localStorage or a cookie because those
 * are per-origin, and an AV is deliberately allowed to live anywhere — the URL
 * is the only channel that crosses that boundary.
 *
 * We then connect with it in the Socket.IO handshake:
 *
 *     io(BD_ORIGIN, { auth: { token } })
 *
 * in `auth`, NOT the query string: a query lands in the server's access log,
 * and the token has already been exposed once in the viewer's own URL.
 *
 * THE DATA MODES (see module_data_modes.md)
 * -----------------------------------------
 *   LD  Live Data   this file. Token -> socket -> BD's live state. Needs BD up.
 *   SD  Static Data a published JSON snapshot. Read-only, always available.
 *   UD  URL Data    the payload carried in the link. Self-contained, size-capped.
 *
 * This shim implements LD and reports honestly when it cannot get it. A fuller
 * client would fall back down the ladder; that is left to the viewer, because
 * what a viewer should show when it cannot reach BD depends on what it displays.
 */
(function (root) {
  'use strict';

  const DEFAULT_BD_ORIGIN = 'https://graph.virtualfictions.uk';

  function readToken() {
    try {
      return new URLSearchParams(location.search).get('t');
    } catch (_) { return null; }
  }

  /*
   * connect({ bdOrigin, onUpdate, onState })
   *
   *   onUpdate(payload)  — called every time BD pushes new state.
   *   onState(state,info)— lifecycle: 'connecting' | 'live' | 'no-token'
   *                        | 'refused' | 'lost'. Drive your own UI from this;
   *                        a viewer that silently shows nothing is the failure
   *                        mode we are trying to avoid.
   *
   * Returns the socket, or null when there was no token to try with.
   */
  function connect(opts) {
    const o        = opts || {};
    const bdOrigin = o.bdOrigin || DEFAULT_BD_ORIGIN;
    const onUpdate = typeof o.onUpdate === 'function' ? o.onUpdate : function () {};
    const onState  = typeof o.onState  === 'function' ? o.onState  : function () {};

    const token = readToken();
    if (!token) {
      // No token: this page was opened cold — a bookmark, a shared link, a
      // reload after the token was consumed. That is not an error, it is a
      // different data mode, and only the viewer knows what to do about it.
      onState('no-token', { reason: 'no ?t= in the URL' });
      return null;
    }

    if (typeof root.io !== 'function') {
      onState('refused', { reason: 'socket.io client not loaded' });
      return null;
    }

    onState('connecting', { bdOrigin });
    const socket = root.io(bdOrigin, { auth: { token } });

    socket.on('connect', function () {
      onState('live', { id: socket.id });
    });

    // A refused token is reported rather than retried. Retrying is pointless:
    // the token is single-use and already consumed, or it expired, and either
    // way only BD can issue another.
    socket.on('connect_error', function (err) {
      onState('refused', { reason: (err && err.message) || 'connect_error' });
    });

    socket.on('disconnect', function (reason) {
      onState('lost', { reason });
    });

    socket.on('msg', function (m) {
      if (!m || m.type !== 'av_update') return;
      onUpdate(m.payload);
    });

    return socket;
  }

  root.BD_AV = { connect: connect, readToken: readToken, DEFAULT_BD_ORIGIN: DEFAULT_BD_ORIGIN };
})(typeof window !== 'undefined' ? window : globalThis);
