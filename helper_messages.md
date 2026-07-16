# Helper Messages — source of truth

All server-sent Helper cards, one .md file. Sync into Memgraph with:

    node bd_tool.js sync-helpers helper_messages.md

Idempotent — safe to run repeatedly. On the first sync each message
gets a fresh `url` (UUID) auto-inserted below its other directives;
that url then becomes the durable identity for future updates.

## Format

Blocks are separated by `---` on a line by itself. Each block is
either the single **hub** declaration or one **helper** message.
Non-directive lines outside blocks (like this prose) are ignored,
so the file reads as a normal markdown doc.

Inside a helper block:

    @helper name:    kebab-case-unique-id      (required, upsert key)
    @helper title:   Short human heading       (required)
    @helper trigger: loose English description (required; server-integration step maps to a code point)
    @helper url:     butterflydreaming.org/n/<uuid>  (auto-generated on first sync; leave off for new messages)
    @flag   update_this: false                 (2026-07-16: gate on UPDATE only.
                                                 Set true to push this block's edits
                                                 to the DB; sync auto-resets to false
                                                 after apply. CREATE for a new block
                                                 is always applied regardless.)

    Message body text — every non-directive line in the block is body.
    Blank lines become paragraph breaks in the rendered card.

## Hub

@hub name: Helper Messages
@hub url: butterflydreaming.org/n/40bc1c0c-17e1-4a55-9af9-a05e5c674bc8
@flag update_this: false

---

## how-to

@helper name: helper-how-to
@helper title: How-to
@helper trigger: boot — sent once per user session when the chat panel first opens (paired with helper-nav-hint via sendInitialHelpersOnce)
@helper url: butterflydreaming.org/n/254bc69a-89b6-4bf8-9780-64c699f93139
@flag update_this: false

Tap a node to search for inspiration for a possible conversation and edit if you wish. Organise on new cards if you wish. Select text and copy will insert it on a new card. Send your top card to the system's Helper for comment — or your Remote once paired.

---

## nav hint

@helper name: helper-nav-hint
@helper title: Navigation gesture
@helper trigger: boot — sent once per user session when the chat panel first opens (paired with helper-how-to via sendInitialHelpersOnce)
@helper url: butterflydreaming.org/n/a50dbc87-45d8-4356-9bbd-54fc6597ff6b
@flag update_this: false

Remember, one click (or tap) to see a node's content. Double click (tap) it to hop about.

---

## no partner waiting

@helper name: helper-no-partner-waiting
@helper title: No Remote Partner waiting
@helper trigger: user pressed Join Remote and no partner is currently waiting to pair
@helper url: butterflydreaming.org/n/b0fffca7-80ec-4b28-b696-a57325fe5575
@flag update_this: false

No Remote Partner currently waiting to pair — to be expected as Butterfly Dreaming is a new initiative. If someone remote presses Join you will be paired automatically. In the meantime your messages will receive special attention from myself (Helper) or you can use another browser to simulate a remote partner.

---

## paired

@helper name: helper-paired-success
@helper title: Successfully partnered
@helper trigger: a pair has just completed successfully (fires to both users at the moment of pairing)
@helper url: butterflydreaming.org/n/d8167049-626b-4ab7-b69b-6d70ff4c2e41
@flag update_this: false

You have successfully partnered — why not create a new card and send them a "Hello from your Remote" message. Use the New Card button, type the message and then use the Send button. Watch out for a message back!

---

## partner disconnected

@helper name: helper-partner-disconnected
@helper title: Partner left
@helper trigger: paired partner left the pair (pressed Say: Bye, closed the tab, or lost their connection)
@helper url: butterflydreaming.org/n/de6b52f8-1f82-4448-8590-a54ea791f814
@flag update_this: false

Partner disconnected.
