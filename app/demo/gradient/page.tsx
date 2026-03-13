import { GradientWave } from "@/components/ui/gradient-wave";

export default function DemoOne() {
  return (
    <div className="relative h-screen w-full flex items-center justify-center bg-black">
      <GradientWave 
        colors={["#38bdf8", "#818cf8", "#c084fc", "#e879f9", "#22d3ee"]}
        darkenTop={true}
      />
      <div className="relative z-10 text-center space-y-4">
        <h1 className="text-white tracking-tighter text-7xl md:text-9xl font-bold drop-shadow-2xl">
          Gradient Wave
        </h1>
        <p className="text-white/70 text-lg md:text-xl font-medium tracking-wide uppercase">
          Premium WebGL Animation
        </p>
      </div>
    </div>
  );
}
