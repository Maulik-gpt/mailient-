'use client';

import React, { useState, useEffect } from 'react';
import WordBlurStream from './WordBlurStream';

export default {
  title: 'Components/WordBlurStream',
  component: WordBlurStream,
};

// Example 1: Short Sentence
export const ShortSentence = () => (
  <div className="p-8 bg-neutral-950 text-white rounded-2xl border border-white/10 max-w-xl">
    <h3 className="text-xs uppercase tracking-widest text-neutral-500 mb-4 font-bold">Short Sentence Demo</h3>
    <div className="text-lg font-medium leading-relaxed">
      <WordBlurStream text="Air scatters short wavelengths more than long ones, and blue is short." />
    </div>
  </div>
);

// Example 2: Long Paragraph
export const LongParagraph = () => (
  <div className="p-8 bg-neutral-950 text-white rounded-2xl border border-white/10 max-w-2xl">
    <h3 className="text-xs uppercase tracking-widest text-neutral-500 mb-4 font-bold">Long Paragraph Demo</h3>
    <div className="text-sm leading-relaxed text-white/80">
      <WordBlurStream
        text="A wonderful serenity has taken possession of my entire soul, like these sweet mornings of spring which I enjoy with my whole heart. I am alone, and feel the charm of existence in this spot, which was created for the bliss of souls like mine. I am so happy, my dear friend, so absorbed in the exquisite sense of mere tranquil existence, that I neglect my talents."
        msPerWord={105}
        holdMs={2000}
      />
    </div>
  </div>
);

// Example 3: Prop Change Reset Behavior (changes text every 4 seconds)
const TEXT_SEQUENCES = [
  "This is the first dynamic text sequence. It will animate and then reset when the next state triggers.",
  "Behold! The second sentence is now animating in from the start because the text prop changed.",
  "Here is the third phase. The head resets immediately as soon as a new text prop is received.",
  "Finally, we loop back to the beginning sequence. Watch the seamless head-reset in action!"
];

export const DynamicResetDemo = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % TEXT_SEQUENCES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 bg-neutral-950 text-white rounded-2xl border border-white/10 max-w-xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xs uppercase tracking-widest text-neutral-500 font-bold">Dynamic Prop Change Demo</h3>
        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-neutral-300 font-mono">
          Changes in {(4000 / 1000).toFixed(0)}s
        </span>
      </div>
      <div className="text-base font-normal min-h-[80px] leading-relaxed text-blue-400">
        <WordBlurStream text={TEXT_SEQUENCES[index]} />
      </div>
    </div>
  );
};

// Premium Complete Showcase Page Component
export const WordBlurStreamShowcase = () => {
  return (
    <div className="min-h-screen bg-black text-white p-12 flex flex-col items-center justify-center gap-8">
      <div className="text-center max-w-lg mb-4">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
          WordBlurStream Component
        </h1>
        <p className="text-sm text-neutral-400 mt-2">
          A premium, GPU-accelerated word-by-word blur reveal streaming animation for high-fidelity chat apps.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl w-full">
        <div className="space-y-8">
          <ShortSentence />
          <DynamicResetDemo />
        </div>
        <div className="flex flex-col justify-between">
          <LongParagraph />
          <div className="p-6 mt-8 bg-[#111] rounded-2xl border border-white/5 text-xs text-neutral-400 font-mono">
            <span className="text-blue-400 font-bold">Math Settings Used:</span>
            <ul className="mt-2 space-y-1">
              <li>• msPerWord: 105ms</li>
              <li>• startupMs: 600ms</li>
              <li>• holdMs: 1500ms</li>
              <li>• maxBlurPx: 7px</li>
              <li>• head: phase * (wordCount + 3)</li>
              <li>• filter: blur &gt; 0.12 ? blur : 'none'</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
