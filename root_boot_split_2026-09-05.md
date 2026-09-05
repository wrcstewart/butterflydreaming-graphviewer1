# Root — the welcome moves to the tap card

2026-09-05. The opening screen is now a greeting and a prompt, carried in code
(ROOT_BOOT_MESSAGE). Root's stored text is what arrives AFTER the tap, so it
drops both "Welcome to" — the greeting has already been given — and the
instruction to tap Root, which by then describes something already done and
would otherwise be spoken back to the user.

---

@match url: butterflydreaming.org/n/8ff97087-9ba5-489f-b57d-1e096e41236e
@flag update_this: false
@set text:
ButterflyDreaming is a free anonymous experimental social media graph that keeps no user data. Intrinsically private and safe, it aims to be a conversational tool that integrates well with other media: read, chat, write, create art and music. First just browse the system to discover some inspiration for conversation and discover how it works. Later you can pair with another user and see each other's browsing, which helps in finding common ground. Tap the Settling node when you are ready.
%%bd_hint Tap the Settling node

---
