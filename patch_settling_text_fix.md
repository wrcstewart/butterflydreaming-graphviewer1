# Settling — text fix (2026-07-16)

Fixes to the Settling Entry node's `text` property:
- `tbottom` → `bottom` (typo)
- `hear .` → `hear.` (stray space before period)
- `music.  Then` → `music. Then` (double space collapsed)
- Leading hyphen → em dash for typography consistency

Uses url as the primary identity (durable UUID); name is a
secondary/friendly identifier for humans reading this patch.

@match url: butterflydreaming.org/n/09a929ac-4d05-442b-860c-5722ecf37792
@match name: Settling

@set text:
A short optional mindfulness settling — relaxing the mind for creative browsing, conversation and creation. Use the player at the screen bottom to hear. You can also optionally listen to some relaxing music. Then click the next node.
@end
