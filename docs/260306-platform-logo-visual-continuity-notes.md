# Platform Logo Visual Continuity Notes

## What the user actually cared about

The problem was never "are we downloading the logo bytes again?"

The problem was:

- when the UI changes state or page
- the logo appears to blink or reload
- the visible experience looks bad

That means the bar for success is visual continuity, not a technically correct story about HTTP caching.

## What we learned

- Browser/network cache and visual continuity are different problems.
- A cached image URL can still visibly blink when React mounts a fresh `<img>` node.
- If the user still sees a transition artifact, then the problem is not solved.
- A placeholder tile is useful when the image paint is not seamless; it prevents empty whitespace.

## Where the agent fucked up

The agent treated a technical hypothesis as if it were the requirement:

- "if the URL was already loaded once, later mounts should be seamless enough to hide the placeholder"

That was an assumption, not a proven fact.

The user had already agreed on the opposite policy:

- keep the placeholder tile unless seamless visual continuity is actually achieved

The agent then still implemented placeholder suppression based on loaded URL memory. Visually, that made things worse because the image was still repainting, so the user saw whitespace instead of a tile.

That was a requirements failure:

- the agent optimized for a technical model
- the user cared about the visible result
- the visible result regressed

## Current state

Current behavior is intentionally conservative:

- image logos keep a muted placeholder tile
- SVG icons do not get an extra inner tile wrapper
- letter fallbacks keep their own foreground tile

This does not solve visual continuity. It only avoids making the transition look worse.

## Does hidden preloading in the layout solve it?

Probably not by itself.

Example idea:

- mount a hidden block of common logos in the layout
- let them load once
- hope later visible logos appear instantly

What this would help with:

- warming bytes and maybe decode for predictable common logos
- making first visible use of a logo cheaper

What it does not guarantee:

- visual continuity across React remounts
- preserving the already-painted DOM/image node
- seamless swap during page/state transitions

So this idea is not worthless, but it is not the core fix. It attacks fetch/decode readiness more than the visible remount problem.

## Why the visible glitch still happens

Even when the URL is cached:

- React mounts a new `<img>`
- the browser paints that new node
- the old painted node is gone
- the user can still see a blink or placeholder

So the real enemy is not just fetch latency. It is losing the already-painted image during UI transitions.

## Untested approach still worth trying

If this is going to be solved visually, the most plausible route is:

1. Keep showing the old painted logo.
2. Start loading the next logo off to the side.
3. Only swap the visible image once the next one has actually loaded.

In practice that likely means a component that:

- keeps `displayedSrc` separate from `requestedSrc`
- loads `requestedSrc` in a hidden/prepared `<img>` or `Image()` object
- updates `displayedSrc` only after `onload`
- preserves the old visible image until the new one is ready

This is a visual continuity strategy, not just a cache strategy.

## Why this approach was not tried yet

It is more invasive than changing placeholder classes or adding URL memory:

- stateful image transition logic
- more moving parts inside `PlatformIcon`
- more opportunity for edge cases around errors and rapid prop changes

But unlike the earlier attempts, it at least targets the actual requirement.

## Practical rule going forward

For remote logos:

- do not claim success based on HTTP caching
- do not suppress placeholder UI based on assumptions
- only call it fixed if the transition is visually smoother in the browser

## Decision note

Until a real visual continuity solution is proven:

- keep the placeholder tile
- avoid assumption-driven "smart" caching logic
- optimize for what the user can see, not what the network tab says
