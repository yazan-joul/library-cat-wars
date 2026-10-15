# Library Cat Wars 🐈

A funny top-down 3D browser game made for Lab 1 of the HUJI Agentic Programming course.

**Play it:** https://yazan-joul.github.io/library-cat-wars/

It's exam season in the glass Hebrew University library, and a gang of Jerusalem campus cats has
snuck in: **Mitzi** (orange tabby), **Shuki** (fast black cat, loves your laptop) and **Gingi**
(chunky grey cat, arrives in round 2). They walk across keyboards, steal sandwiches, unplug
computers, knock coffee cups off tables and nap on everyone's books. You have 3 minutes to finish your assignment. Lure the cat away with treats and yarn, and
**keep quiet**, or the librarian will kick you out.

## Controls

| Key | Action |
|---|---|
| WASD / Arrows | Walk |
| Shift | Run (fast, but loud) |
| Hold Space | Type at your seat (the glowing ring) |
| 1 / Left click | Toss a treat where you aim |
| 2 / Right click | Roll a ball of yarn |
| E | Pet a calm cat, silence a ringing phone, restock at the snack machine, replug dark monitors |
| M | Music on/off |

## How to win

- Fill the assignment bar to 100% before the timer runs out.
- If the cat sits on your laptop, your progress gets deleted. Lure it off with a treat or yarn.
- Pet a calm (just-fed) cat and it leaves happily for a while.
- Running, crashing cats and students chasing the cat all raise the noise meter. At 100% the
  librarian throws you out.
- Supplies are tight: 3 treats and 2 yarn. The snack machine gives a partial refill and then needs
  25 seconds to restock.
- Noise comes from everywhere: hungry cats yowl, cats mash your keyboard and knock cups over,
  phones ring until you silence them, and running is loud.
- Random disasters: power flickers, book avalanches, coffee spills (you slip even when walking, and
  drop a treat), ringing phones, Wi-Fi outages and a sneaky kitten.
- Typing without interruption builds a 🔥 focus streak (up to 1.6× speed). Grab ☕ espresso
  when it appears on the floor for 10 seconds of double-speed typing.
- It escalates: at 2:00 the cat gets bolder, at 1:00 it gets the zoomies, and the last 30 seconds
  are PANIC MODE. The music speeds up each round. A red ❗ and an alarm warn you when the cat
  heads for your laptop, and an arrow at the screen edge shows where it is when it's off camera.

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
