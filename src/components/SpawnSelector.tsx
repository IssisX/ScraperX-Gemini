import React, { useState } from 'react';
import { SimulationEngine } from '../sim/simulationEngine';
import { InitialSpawn } from '../types';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';

interface SpawnSelectorProps {
  engine: SimulationEngine;
}

const SPAWN_POINTS = [
  { id: InitialSpawn.ExteriorGrade, label: 'Exterior Grade (Approach)' },
  { id: InitialSpawn.MachineYard, label: 'Machine Yard (Steam Plant)' },
  { id: InitialSpawn.LiftPlatform, label: 'Steam Lift Platform' },
  { id: InitialSpawn.CatwalkTreadle, label: 'Catwalk Treadle (Pedal)' },
  { id: InitialSpawn.TranslatingSupport, label: 'Translating Support Platform' },
  { id: InitialSpawn.RotatingSupport, label: 'Rotating Support Platform' },
  { id: InitialSpawn.VaultApproach, label: 'Vault Rail Approach' },
  { id: InitialSpawn.MantleApproach, label: 'Mantle Ledge Approach' },
  { id: InitialSpawn.KernelJibStation, label: 'KX-JIB Crane Pendant Station' },
  { id: InitialSpawn.KernelCrateTop, label: 'KX-CRATE (Ride Crate)' },
  { id: InitialSpawn.KernelNeedleStation, label: 'KX-NEEDLE Bridge Station' },
  { id: InitialSpawn.KernelSumpStation, label: 'KX-SUMP Valve Station' },
  { id: InitialSpawn.HighDrop, label: 'High Drop (Parachute Test)' },
  { id: InitialSpawn.SurvivableDrop, label: 'Survivable Drop (~12m)' },
];

export const SpawnSelector: React.FC<SpawnSelectorProps> = ({ engine }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSpawn, setSelectedSpawn] = useState(InitialSpawn.ExteriorGrade);

  const handleSelect = (spawn: InitialSpawn) => {
    setSelectedSpawn(spawn);
    engine.configureInitialSpawn(spawn);
    setIsOpen(false);
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-black/80 hover:bg-neutral-900 border border-neutral-700 text-neutral-200 px-3 py-1.5 rounded-full text-xs font-mono flex items-center gap-2 shadow-lg backdrop-blur-md transition-colors"
        >
          <MapPin className="w-3.5 h-3.5 text-amber-400" />
          <span>Spawn: <strong className="text-amber-300">{SPAWN_POINTS.find(s => s.id === selectedSpawn)?.label}</strong></span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />}
        </button>

        {isOpen && (
          <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 w-64 max-h-80 overflow-y-auto bg-black/90 backdrop-blur-md border border-neutral-700 rounded-lg shadow-2xl p-1 font-mono text-xs z-40">
            {SPAWN_POINTS.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelect(s.id)}
                className={`w-full text-left px-3 py-2 rounded text-xs transition-colors flex items-center justify-between ${
                  selectedSpawn === s.id
                    ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-2 border-amber-400'
                    : 'text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
