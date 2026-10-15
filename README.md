# Library Cat Wars 🐈

A funny top-down 3D browser game made for Lab 1 of the HUJI Agentic Programming course.

**Play it:** https://yazan-joul.github.io/library-cat-wars/

It's exam season in the glass Hebrew University library, and a mischievous Jerusalem campus cat has
snuck in. It walks across keyboards, steals sandwiches, unplugs computers and naps on everyone's
books. You have 3 minutes to finish your assignment. Lure the cat away with treats and yarn, and
**keep quiet**, or the librarian will kick you out.

## Controls

| Key | Action |
|---|---|
| WASD / Arrows | Walk |
| Shift | Run (fast, but loud) |
| Hold Space | Type at your seat (the glowing ring) |
| 1 / Left click | Toss a treat where you aim |
| 2 / Right click | Roll a ball of yarn |
| E | Pet a calm cat, restock at the snack machine, replug dark monitors |

## How to win

- Fill the assignment bar to 100% before the timer runs out.
- If the cat sits on your laptop, your progress gets deleted. Lure it off with a treat or yarn.
- Pet a calm (just-fed) cat and it leaves happily for a while.
- Running, crashing cats and students chasing the cat all raise the noise meter. At 100% the
  librarian throws you out.
- Random disasters: power flickers, book avalanches, coffee spills (don't run through them!),
  Wi-Fi outages and a sneaky kitten.

## Tech

Plain HTML, CSS and JavaScript with [Three.js](https://threejs.org/) r149 (vendored in `lib/`).
No build step or server: open `index.html` directly or serve the folder as static files.
All models are built from primitives and all sounds are synthesized with Web Audio.

```
index.html   page, HUD and screens
style.css    cartoon UI styles
js/world.js  the glass library, furniture, students, librarian
js/player.js player movement/typing, thrown treats and yarn
js/cat.js    the cat's mischief AI and animation
js/events.js stressed students and random disasters
js/main.js   game loop, input, camera, scoring
```
