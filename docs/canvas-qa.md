# Canvas device QA

Audit of the homepage device field on `cursor/retro-device-canvas-af11`, before the redraw.

Each device was parked on a cell whose screen reads **Postcards from Mars** (the longest catalog name, 19 characters) and photographed at 2×.

- Desktop: 1440×900, cell 248px
- Mobile: 390×844, cell 200px

Shells are fixed CSS pixels, so the close-ups measure the same at both widths. The field shots show how that sits in the page. Overflow numbers are `scrollWidth − clientWidth` and `scrollHeight − clientHeight` on the name, in CSS pixels. A positive number means the name is clipped (the label uses `white-space: nowrap` and `text-overflow: ellipsis`, and the screen uses `overflow: hidden`).

## Field

Desktop, 1440 wide. Several labels already end in an ellipsis at this size (`Between Flo…`, `Postcards from …`, `Agent Terra…` is cut by the viewport). The objects read as flat stickers more than as specific machines.

![Desktop field before the redraw](qa/before-field-desktop.png)

Mobile, 390 wide. The same shells, packed tighter. The corner card covers the top row. The pager’s label is a sliver under the icon.

![Mobile field before the redraw](qa/before-field-mobile.png)

## Candybar

![Candybar, desktop](qa/before-candy-desktop.png)
![Candybar, mobile](qa/before-candy-mobile.png)

- Name clipped. “Postcards from Mars” paints as “Postcard…” — 50px of horizontal overflow (112px of text in a 62px label) at both widths.
- The icon sits flush with the top edge of the glass.
- Not a candybar. The shell is a flat dark rounded rectangle: no earpiece slots, no microphone, no navigation key, no call and end keys. The keypad is a flat 3×3 grid rather than twelve raised keys.
- The screen is a cream card, not a small green LCD.
- Proportions are a generic tall slab. There is no shoulder, chin, or layered highlight, so it does not read as a 3310-style phone.

## Flip phone

![Flip phone, desktop](qa/before-flip-desktop.png)
![Flip phone, mobile](qa/before-flip-mobile.png)

- Name clipped to “Postcard…” — 48px of horizontal overflow.
- The label’s line box is 17px tall inside an 11px client height, so 6px of the text is cut by the bottom of the glass. The icon is flush with the top of a 64×40 screen.
- Not a flip phone. Two gray slabs, a checkerboard where the keys should be, and a plain hinge bar. No metal chin, no earpiece, no thin lid, no antenna.
- The screen is the same cream card as every other device.

## Rotary desk phone

![Rotary phone, desktop](qa/before-rotary-desktop.png)
![Rotary phone, mobile](qa/before-rotary-mobile.png)

- The name is `display: none`. The screen shows only the icon, so the title never appears.
- The dial is two concentric circles. No finger holes, no finger stop.
- The handset is a thick black arch, not an earpiece and mouthpiece sitting in a cradle.
- The base is a flat cream pill. No feet, no cradle buttons, no sculpted body.
- The “screen” is a cream rectangle with no bezel, so it does not read as a number window.

## Early slab phone

![Slab phone, desktop](qa/before-slab-desktop.png)
![Slab phone, mobile](qa/before-slab-mobile.png)

- Name clipped to “Postcards …” — 40px of horizontal overflow in a 72px screen.
- No earpiece slot, no metal band, no rounded glass. The home control is an empty ring floating on a flat black body.
- The icon is a small square in a sea of black, not a glossy home-screen icon.
- One flat fill. No glass highlight, no edge highlight, no chin.

## Handheld console

![Handheld, desktop](qa/before-game-desktop.png)
![Handheld, mobile](qa/before-game-mobile.png)

- Name clipped to “Postcards from …” — 14px of horizontal overflow.
- The cross is a flat plus. The two red dots have no letters, and there is no start, no select, no speaker slots, and no power lamp.
- The shell is one olive gradient. The classic brick has a recessed screen well, a darker lower half, and a gray-green body.
- The glass is a pale green card with no dark bezel, so it does not read as a dot-matrix screen.

## Pager

![Pager, desktop](qa/before-pager-desktop.png)
![Pager, mobile](qa/before-pager-mobile.png)

- Severe clip. The screen is 92×34. The 26px icon fills it, and the label is left 5px of client height against a 17px line box, so only the tops of the letters show. Horizontal overflow is 20px on top of that.
- The icon is flush with the top edge of the glass.
- Not recognizable as a pager beyond a dark bar and a red lamp. No clip, no display bezel, no button.

## PDA

![PDA, desktop](qa/before-pda-desktop.png)
![PDA, mobile](qa/before-pda-mobile.png)

- Name clipped to “Postcards fro…” — 28px of horizontal overflow.
- Four dots stand in for the writing area, the app buttons, and the scroll control.
- Flat beige card. No stylus lane, no power button, no metal edge, no green mono screen.

## Compact Macintosh

![Compact Mac, desktop](qa/before-mac-desktop.png)
![Compact Mac, mobile](qa/before-mac-mobile.png)

- Name clipped to “Postcards from …” — 8px of horizontal overflow. This is the largest of the small screens and it still cannot hold the longest title on one line.
- The chin is two gray rules, not a disk slot. No feet, no inset bezel depth, no curve in the glass.
- The case is a flat beige box, so the tall compact-Mac silhouette (thick bezel, square tube, slot under the screen) is missing.

## Beige CRT

![CRT, desktop](qa/before-crt-desktop.png)
![CRT, mobile](qa/before-crt-mobile.png)

- The longest name fits, with 0px of overflow, in a 112×78 screen. It sits on one line with 4px of side padding, so it is flush and one wider title would clip.
- The stand is a rectangle stacked on a wider rectangle. No neck, no foot, no side depth.
- The glass is flat. No convex highlight, no control buttons, no vents.
- The beige is a single flat fill.

## Bulbous all-in-one

![All-in-one, desktop](qa/before-imac-desktop.png)
![All-in-one, mobile](qa/before-imac-mobile.png)

- The longest name fits, with 0px of overflow, on the same flush one-line layout as the CRT.
- The body is a teal rounded rectangle on a plain foot. The egg, the top handle groove, the translucent chin, the hemispherical stand, and the curved tube are all missing.
- One flat color. Nothing suggests translucent plastic.

## Terminal

![Terminal, desktop](qa/before-term-desktop.png)
![Terminal, mobile](qa/before-term-mobile.png)

- The longest name fits, in green on a dark green field. That is the right idea, and it is not clipped.
- No phosphor glow, no scan, no curved glass. The type is the same UI sans as every other screen.
- The “keyboard” is a striped bar, not keycaps. The case is a flat dark rounded rectangle, so it does not read as a terminal.

## Laptop

![Laptop, desktop](qa/before-laptop-desktop.png)
![Laptop, mobile](qa/before-laptop-mobile.png)

- The longest name fits, with 0px of overflow.
- The object is a lid plus a gradient bar. No hinge, no keyboard, no trackpad, no palm rest.
- It reads as a generic silver slab, not a PowerBook-style clamshell. The screen has no bezel depth.

## Shared

- Every screen uses the same layout: a 26px icon and an 11px nowrap label. Anything wider than the glass becomes an ellipsis. The flip phone and the pager also slice the label vertically.
- Nothing on a screen is styled for that device. LCDs, the terminal, and the slab phone all share one card, with a color swap.
- Shells are flat gradients. Signature parts (navi key, finger holes, home button, D-pad, disk slot, egg shape, phosphor) are missing or reduced to a single shape.
- Devices do not scale with the cell, so 390 and 1440 fail in the same places. At 390 the corner card also covers the top row, which is separate from the bezel clipping.
