import React, { useRef, useState, useMemo } from 'react';
import { SimulationEngine } from './sim/simulationEngine';
import { SimulationSnapshot, InitialSpawn } from './types';
import { Viewport3D } from './components/Viewport3D';
import { HUD } from './components/HUD';
import { ControlsOverlay } from './components/ControlsOverlay';
import { SpawnSelector } from './components/SpawnSelector';

export const App: React.FC = () => {
  const engine = useMemo(() => new SimulationEngine(InitialSpawn.ExteriorGrade), []);
  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null);
  const lookDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0e0d0c]">
      {/* 3D Simulation Viewport */}
      <Viewport3D engine={engine} onSnapshot={setSnapshot} lookDeltaRef={lookDeltaRef} />

      {/* ScraperX Native HUD */}
      <HUD snapshot={snapshot} />

      {/* Spawn Location Selector */}
      <SpawnSelector engine={engine} />

      {/* Touch & Desktop Controls Overlay */}
      <ControlsOverlay engine={engine} snapshot={snapshot} lookDeltaRef={lookDeltaRef} />
    </div>
  );
};

export default App;
