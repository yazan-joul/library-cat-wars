# Library Cat Wars: Implementation Plan

A funny top-down 3D browser game. It's exam season in a huge Hebrew University library with glass walls. A mischievous Jerusalem campus cat is causing chaos. You have to finish your assignment before the exam, protect your seat, and lure the cat away with treats and toys **without making noise**.

Target: playable in under 1 hour of build time. Static site, GitHub Pages, no backend.

---

## 1. Tech choices

| Concern | Choice | Why |
|---|---|---|
| 3D rendering | **Three.js** (pinned, e.g. `three@0.160.0`) loaded from a CDN with an import map | Real 3D, no build step, works on GitHub Pages |
| Models | Built from primitives (boxes, cylinders, spheres, capsules) | No asset pipeline; fits a chunky cartoon style |
| Text bubbles ("SHHH!", "😾", "asdfgh") | HTML overlay elements placed at projected 3D positions | Cheap, readable, emoji-friendly |
| Sound | Tiny Web Audio synth: meow, "shh", pop (stretch goal) | No audio files needed |
| Persistence | `localStorage` for the best score only (wrapped in try/catch) | Optional nice touch |

### File layout
```
index.html        page, HUD markup, start/end screens, import map
style.css         HUD, bubbles, screens, cartoon fonts/colors
js/main.js        setup, game loop, state (menu / playing / won / lost)
js/world.js       library scene: glass walls, pillars, tables, desks, students
js/cat.js         cat model + mischief AI (state machine)
js/player.js      player model, movement, noise, item use
js/events.js      random library disasters
js/ui.js          HUD meters, speech bubbles, messages
```

---

## 2. The world (visual spec)

- **Camera:** angled top-down view (about 55°) that smoothly follows the player, so you can see the whole local area.
- **Library hall:** a long rectangular room.
  - **Glass walls:** translucent light-blue panels with thin frames and soft "aquarium" light. Outside are faint Jerusalem-stone colored blocks and pine trees.
  - **High ceiling:** tall pillars rising out of view, plus hanging lamps on long cords that sway slightly.
  - **Center:** 5–6 **round study tables** with chairs, books, laptops, and coffee cups.
  - **Sides:** rows of **computer desks** with monitors that glow; a dark screen means unplugged.
  - **Librarian desk** near the entrance with a stern librarian and a "שקט! / QUIET!" sign.
  - **Snack machine:** the place to refill treats.
  - Banner: "תקופת מבחנים – Exam Season".
- **Style:** warm, saturated palette (cream floor, teal glass, orange cat, pastel students) with soft shadows. Every character is a chunky "toy" shape.

---

## 3. Characters

### Player (you, a stressed student)
- WASD / arrows to walk. **Shift** to run (fast but **noisy**).
- Your **seat** is one specific round table, marked with a glowing ring and your laptop.
- Stand at your seat and hold **Space** to type. This fills your **Assignment** progress bar, with typing particles and a bobbing head.

### The Cat (Jerusalem campus cat)
Orange tabby with a big tail. Its behavior is a simple state machine:

```
WANDER → pick a mischief target → WALK TO IT → DO MISCHIEF (3–6s) → WANDER
        ↘ if a treat or toy is nearby → LURED (goes to it, eats or plays, calms down)
        ↘ if a student runs at it → FLEES (zoomies, knocks things over)
```

Mischief types, each with a visible effect:
| Mischief | Effect |
|---|---|
| **Keyboard walk** | Monitor shows "asdfghjkl;;;;", and that student panics. **On YOUR laptop it deletes progress.** |
| **Steal snack** | Cat runs off with a sandwich, and the student chases it, which **raises noise**. |
| **Unplug computer** | Monitor goes black and sparks fly. The student's stress spikes. |
| **Sit on books** | Cat loafs on a stack. That table's students freeze and can't study. |

The cat targets **your seat about 30% of the time**, so you always have to watch it.

### NPC students
- Sit at tables and bob while studying.
- **Stress** rises when the cat bothers them. They sweat drops, shake, and show 😱 bubbles.
- When their stress maxes out, they **jump up and chase the cat** with flailing arms. That's very noisy and makes the cat flee into more chaos.

### Librarian
- Watches the **Noise meter**. At thresholds she shows a giant "SHHHH!" bubble and the screen shakes.

---

## 4. Player tools (the "gentle" solutions)

| Key | Tool | Behavior | Supply |
|---|---|---|---|
| **1** / left click | **Treat** 🐟 | Tossed at the mouse cursor position. If the cat is within range it walks over, eats it (happy hearts), and stays calm for about 8s. | 5, refill at snack machine |
| **2** / right click | **Yarn ball** 🧶 | Rolls along the floor. The cat chases it for a long distance, which is great for leading the cat **far from your seat**. | 3, refill at snack machine |
| **E** | **Pet** | When adjacent to a calm cat, it purrs and leaves the area. Bonus points. | ∞ |

Running at or "chasing" the cat works but raises noise. That's the intended tension: **fast vs. quiet**.

---

## 5. Meters & rules

- **Assignment progress (0–100%)**: you win at 100%.
- **Exam timer**: about 3 minutes. You lose when it hits 0.
- **Noise (0–100)**: running, chasing students, and disasters raise it, and it slowly decays. **At 100 the librarian kicks you out** and you lose.
- **Chaos meter**: overall library stress. It doesn't kill you, but it feeds the score and makes the cat more active.

**Score** = progress bonus + time left + cats lured + low chaos. Best score is saved locally.

---

## 6. Random library disasters (one every ~20–30s, announced with a banner)

1. **Power flicker**: lights dim and every monitor blinks. Typing pauses for 3s.
2. **Book avalanche**: a shelf dumps books that bounce comically and block a path.
3. **Coffee spill**: a brown puddle you slide on, which is noisy if you run through it.
4. **Wi-Fi down**: "📶❌" bubbles everywhere. Students groan and stress rises.
5. **Second cat** (late game): a smaller kitten joins for 20s.

---

## 7. Exaggerated animation checklist
- Squash & stretch on cat jumps and on landing items.
- Cat tail wag sine wave and ear twitch. Loafing flattens the cat.
- Students bob, shake when stressed, and their arms windmill when chasing.
- Lamps sway, monitors flicker, books bounce, typing letter particles.
- Screen shake on "SHHH!" and on disasters.
- Floating text and emoji bubbles for every event (😾 💤 🐟 ❤️ SHHH! asdfgh).

---

## 8. Screens
- **Start screen:** title "Library Cat Wars 🐈", a one-line story, controls, and a Start button.
- **HUD:** progress bar, timer, noise meter, chaos meter, treat and yarn counts, event banner.
- **End screens:**
  - Win: "Submitted 2 seconds before deadline!"
  - Lose: "Kicked out by the librarian" or "Time's up".
  - Both show the score and a Play again button.

---

## 9. Build milestones (~55 min), one commit + push each

| # | Milestone | Time | Done when |
|---|---|---|---|
| 1 | Scaffold: index.html, import map, Three.js scene, camera, lights, floor. Git init + `gh` repo + Pages on. | 8 min | Live URL shows a lit floor |
| 2 | Library world: glass walls, pillars, round tables, computer desks, librarian, signs | 10 min | Library looks right from the camera |
| 3 | Player movement + camera follow + seat + typing progress + timer | 8 min | Can walk to seat and fill progress |
| 4 | Cat model + state machine + 4 mischief types + effect on your laptop | 12 min | Cat roams and wrecks stuff |
| 5 | Treats, yarn, pet, snack-machine refill, noise meter, librarian SHHH | 8 min | Can lure the cat quietly; can lose by noise |
| 6 | NPC stress/chase, random disasters, bubbles, screen shake | 6 min | Library feels chaotic and funny |
| 7 | Start/end screens, score, polish, balance pass | 3 min | Full loop: start → win/lose → replay |

**Stretch, if time remains:** Web Audio meows and shh, mobile touch controls, the kitten disaster, difficulty levels.

---

## 10. Risks & mitigations
- **Too much scope:** milestones 1–5 already form a complete, fun game. Steps 6–7 are additive.
- **Performance:** primitive meshes, one shadow-casting light, shared materials.
- **Pathfinding:** none. The cat moves in straight lines with simple obstacle avoidance (steer around table circles). That's good enough, and it's funny when the cat jumps *over* tables.
