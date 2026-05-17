# WordBlurStream Component

A React + TypeScript component that animates a string of text in a premium, GPU-accelerated "word-by-word blur reveal" style. It replicates the sophisticated streaming/thinking text effect seen in top-tier AI chat applications.

## Behavior

- **Whitespace Preservation**: The text is split into words while preserving exact inter-word whitespaces so wrapping behaves identically to static text.
- **Staggered Blur-In**: Words appear one after another, staggered. Each word animates smoothly from `opacity: 0` + `filter: blur(7px)` to `opacity: 1` + `filter: none`.
- **Zero Layout Shift**: Words take up their final resolved space from the first frame.
- **Looping & Holding**: Once all words are revealed, it holds the final crisp state for a configurable duration (`holdMs`, default `1500ms`), then resets and loops.
- **SSR-Safe**: No references to `window` or client-only globals at module scope.
- **Client-Driven High Performance**: Driven entirely via a single `requestAnimationFrame` loop, bypassing standard CSS keyframe limitations.

## Timings & Reveal Mathematics (Exact Spec)

- The animation runs as a single normalized phase `0 → 1` over the play duration `playMs`:
  $$\text{playMs} = (\text{wordCount} \times \text{msPerWord}) + \text{startupMs}$$
  *(where `msPerWord` defaults to `105` and `startupMs` defaults to `600`)*
- A virtual "head" advances through the words:
  $$\text{head} = \text{phase} \times (\text{wordCount} + 3)$$
  *(the $+3$ buffer allows the final words sufficient time to fully resolve before holding)*
- For each word at index `idx` (0-indexed):
  $$t = \text{clamp01}((\text{head} - \text{idx}) \times 0.55)$$
  $$\text{blur} = (1 - t) \times \text{maxBlurPx}$$
  $$\text{opacity} = t$$
  $$\text{filter} = \text{blur} > 0.12 \ ? \ \text{`blur(} \text{blur.toFixed(2)} \text{px)`} \ : \ \text{'none'}$$
- **GPU Optimization**: Applying `filter: none` when the blur becomes negligible removes the GPU layer constraint and produces crisp, legible text at rest.

## API Reference

```tsx
import { WordBlurStream } from './WordBlurStream';

<WordBlurStream
  text="Air scatters short wavelengths more than long ones, and blue is short."
  // Optional overrides:
  msPerWord={105}       // Delay coefficient per word (default: 105)
  startupMs={600}       // Extra timing before first word starts (default: 600)
  holdMs={1500}         // Milliseconds to hold the completed state before resetting (default: 1500)
  maxBlurPx={7}         // Starting blur intensity in pixels (default: 7)
  loop={true}           // Loop the animation forever (default: true)
  onComplete={() => {}} // Callback fired at completion of a cycle
/>
```

## Performance & Optimization

1. **Inline-Block Layout**: Each animating word is wrapped in an inline-block `<span>` so filters/transforms do not break text wrap and layout.
2. **GPU Will-Change**: Employs `will-change: filter, opacity` only on active spans to prepare GPU rendering pipelines without overloading system memory.
3. **Ref-Based Resets**: Re-renders smoothly and instantly resets the virtual head whenever the `text` prop changes mid-animation.
