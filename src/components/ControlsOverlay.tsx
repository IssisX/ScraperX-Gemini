import React, { useRef, useState, useEffect } from 'react';
import { SimulationEngine } from '../sim/simulationEngine';
import { SimulationSnapshot } from '../types';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Wind, ShieldAlert, ArrowUpCircle } from 'lucide-react';

interface ControlsOverlayProps {
  engine: SimulationEngine;
  snapshot: SimulationSnapshot | null;
  lookDeltaRef: React.MutableRefObject<{ x: number; y: number }>;
}

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({ engine, snapshot, lookDeltaRef }) => {
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDraggingMove, setIsDraggingMove] = useState(false);
  const touchOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mouse look drag state when pointer not locked
  const isMouseDownRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Keyboard controls
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;

      if (e.code === 'Space') {
        e.preventDefault();
        engine.requestJump();
      } else if (e.code === 'KeyE') {
        engine.requestTraversal();
      } else if (e.code === 'KeyQ') {
        engine.requestRelease();
      } else if (e.code === 'KeyF') {
        engine.requestParachute();
      } else if (e.code === 'KeyV') {
        engine.requestValveToggle();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Continuous input poll interval
    const interval = setInterval(() => {
      let mx = 0;
      let mz = 0;
      if (keysPressed.current['KeyW']) mz += 1;
      if (keysPressed.current['KeyS']) mz -= 1;
      if (keysPressed.current['KeyA']) mx -= 1;
      if (keysPressed.current['KeyD']) mx += 1;

      // Arrow keys for JIB / Needle pendant
      let slew = 0;
      let hoist = 0;
      if (keysPressed.current['ArrowRight']) slew += 1;
      if (keysPressed.current['ArrowLeft']) slew -= 1;
      if (keysPressed.current['ArrowUp']) hoist += 1;
      if (keysPressed.current['ArrowDown']) hoist -= 1;

      engine.setJibSlewInput(slew);
      engine.setJibHoistInput(hoist);
      engine.setNeedleHoistInput(hoist);

      // Combine with touch movement
      if (!isDraggingMove) {
        engine.setMoveInput(mx, mz);
      }
    }, 16);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(interval);
    };
  }, [engine, isDraggingMove]);

  // Touch handlers for virtual joystick
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchOriginRef.current = { x: touch.clientX, y: touch.clientY };
    setIsDraggingMove(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingMove) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchOriginRef.current.x;
    const dy = touch.clientY - touchOriginRef.current.y;
    const radius = 50;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, radius);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;
    setKnobPos({ x: kx, y: ky });

    // Normalized move input: x is right/left, z is forward/backward
    const normX = kx / radius;
    const normZ = -ky / radius;
    engine.setMoveInput(normX, normZ);
  };

  const handleTouchEnd = () => {
    setIsDraggingMove(false);
    setKnobPos({ x: 0, y: 0 });
    engine.setMoveInput(0, 0);
  };

  // Drag look handling over the viewport
  const handleMouseDown = (e: React.MouseEvent) => {
    isMouseDownRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    lookDeltaRef.current.x += dx;
    lookDeltaRef.current.y += dy;
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
  };

  const showPendantControls = snapshot?.jib_station_active || snapshot?.needle_station_active;

  return (
    <div
      className="absolute inset-0 pointer-events-auto"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Desktop Key Helper Banner */}
      <div className="hidden lg:flex absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-neutral-800 text-xs text-neutral-300 gap-4 shadow-lg items-center pointer-events-none">
        <span><strong className="text-amber-400">WASD</strong> Move</span>
        <span><strong className="text-amber-400">Mouse</strong> Look</span>
        <span><strong className="text-amber-400">SPACE</strong> Jump</span>
        <span><strong className="text-amber-400">E</strong> Vault/Mantle</span>
        <span><strong className="text-amber-400">Q</strong> Release</span>
        <span><strong className="text-amber-400">F</strong> Parachute</span>
        <span><strong className="text-amber-400">V</strong> Sump Valve</span>
        <span><strong className="text-amber-400">Arrows</strong> Crane/Needle</span>
      </div>

      {/* Virtual Joystick (Touch devices) */}
      <div
        className="absolute bottom-6 left-6 w-32 h-32 rounded-full bg-black/40 border-2 border-neutral-700/60 flex items-center justify-center touch-none select-none z-20 backdrop-blur-xs md:opacity-80"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="w-12 h-12 rounded-full bg-amber-500/80 shadow-md transform"
          style={{ transform: `translate(${knobPos.x}px, ${knobPos.y}px)` }}
        />
      </div>

      {/* Action Buttons on Bottom Right */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-3 z-20 pointer-events-auto">
        {/* Pendant Crane/Needle Controls when at station */}
        {showPendantControls && (
          <div className="bg-black/75 backdrop-blur-md p-3 rounded-lg border border-amber-500/50 shadow-xl mb-2 flex flex-col items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-amber-300">
              {snapshot?.jib_station_active ? 'KX-JIB PENDANT' : 'KX-NEEDLE PENDANT'}
            </span>
            <div className="grid grid-cols-3 gap-1">
              <div />
              <button
                className="w-10 h-10 rounded bg-neutral-800 hover:bg-neutral-700 active:bg-amber-600 flex items-center justify-center text-white"
                onMouseDown={() => { engine.setJibHoistInput(1); engine.setNeedleHoistInput(1); }}
                onMouseUp={() => { engine.setJibHoistInput(0); engine.setNeedleHoistInput(0); }}
                onTouchStart={() => { engine.setJibHoistInput(1); engine.setNeedleHoistInput(1); }}
                onTouchEnd={() => { engine.setJibHoistInput(0); engine.setNeedleHoistInput(0); }}
                title="Raise Hoist"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <div />
              <button
                className="w-10 h-10 rounded bg-neutral-800 hover:bg-neutral-700 active:bg-amber-600 flex items-center justify-center text-white"
                onMouseDown={() => engine.setJibSlewInput(-1)}
                onMouseUp={() => engine.setJibSlewInput(0)}
                onTouchStart={() => engine.setJibSlewInput(-1)}
                onTouchEnd={() => engine.setJibSlewInput(0)}
                title="Slew Left"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                className="w-10 h-10 rounded bg-neutral-800 hover:bg-neutral-700 active:bg-amber-600 flex items-center justify-center text-white"
                onMouseDown={() => { engine.setJibHoistInput(-1); engine.setNeedleHoistInput(-1); }}
                onMouseUp={() => { engine.setJibHoistInput(0); engine.setNeedleHoistInput(0); }}
                onTouchStart={() => { engine.setJibHoistInput(-1); engine.setNeedleHoistInput(-1); }}
                onTouchEnd={() => { engine.setJibHoistInput(0); engine.setNeedleHoistInput(0); }}
                title="Lower Hoist"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
              <button
                className="w-10 h-10 rounded bg-neutral-800 hover:bg-neutral-700 active:bg-amber-600 flex items-center justify-center text-white"
                onMouseDown={() => engine.setJibSlewInput(1)}
                onMouseUp={() => engine.setJibSlewInput(0)}
                onTouchStart={() => engine.setJibSlewInput(1)}
                onTouchEnd={() => engine.setJibSlewInput(0)}
                title="Slew Right"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Traversal / Sump Valve / Parachute / Jump Action Row */}
        <div className="flex gap-2">
          {snapshot?.sump_station_active && (
            <button
              onClick={() => engine.requestValveToggle()}
              className="px-3 py-2.5 rounded bg-orange-700 hover:bg-orange-600 active:bg-orange-800 text-white font-mono text-xs flex items-center gap-1.5 shadow-lg border border-orange-500"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>ISOLATE (V)</span>
            </button>
          )}

          <button
            onClick={() => engine.requestParachute()}
            className={`px-3 py-2.5 rounded font-mono text-xs flex items-center gap-1.5 shadow-lg border transition-colors ${
              snapshot?.parachute_deployed
                ? 'bg-emerald-600 border-emerald-400 text-white'
                : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-200'
            }`}
          >
            <Wind className="w-4 h-4" />
            <span>CHUTE (F)</span>
          </button>

          <button
            onClick={() => engine.requestTraversal()}
            className={`px-4 py-2.5 rounded font-mono text-xs font-bold flex items-center gap-1.5 shadow-lg border transition-colors ${
              snapshot?.ledge_available
                ? 'bg-amber-600 hover:bg-amber-500 border-amber-400 text-black animate-pulse'
                : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
            }`}
          >
            <ArrowUpCircle className="w-4 h-4" />
            <span>TRAVERSE (E)</span>
          </button>

          <button
            onClick={() => engine.requestJump()}
            className="w-14 h-12 rounded bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold font-mono text-xs flex items-center justify-center shadow-lg border border-amber-300"
          >
            JUMP
          </button>
        </div>
      </div>
    </div>
  );
};
