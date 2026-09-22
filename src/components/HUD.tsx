import React from 'react';
import { SimulationSnapshot, TraversalState, FallState } from '../types';

interface HUDProps {
  snapshot: SimulationSnapshot | null;
}

export const HUD: React.FC<HUDProps> = ({ snapshot }) => {
  if (!snapshot) return null;

  const getStatusText = (): string => {
    if (snapshot.traversal_state === TraversalState.Hanging) return 'HANGING ON NATIVE LEDGE';
    if (snapshot.traversal_state === TraversalState.Mantling) return 'MANTLING REAL GEOMETRY';
    if (snapshot.traversal_state === TraversalState.Vaulting) return 'VAULTING REAL GEOMETRY';
    if (snapshot.jib_station_active) return 'AT THE JIB PENDANT / ARROWS DRIVE-HOIST';
    if (snapshot.needle_station_active) return 'AT THE NEEDLE PENDANT / ARROWS RAISE-LOWER';
    if (snapshot.sump_station_active) return 'AT THE SUMP VALVE / V TO ISOLATE';
    if (snapshot.player_grounded) {
      if (snapshot.support_entity_id === 28) return 'RIDING THE CRATE';
      if (snapshot.support_entity_id === 33) return 'ON THE SEATED NEEDLE';
      if (snapshot.support_entity_id === 34) return 'ON THE DRAINED GRATE';
      if (snapshot.support_entity_id === 16) return 'RIDING THE STEAM LIFT';
      if (snapshot.support_entity_id === 19) return 'ON THE CATWALK';
      if (snapshot.support_entity_id === 24) return 'ON THE TREADLE / VALVE HELD OPEN';
      if (snapshot.support_entity_id === 14) return 'STANDING ON THE TIPPER';
      if (snapshot.support_entity_id === 3) return 'NATIVE MOVING SUPPORT ONLINE';
      return 'AT GRADE';
    }
    if (snapshot.fall_state === FallState.Parachuting) return 'PARACHUTE DEPLOYED';
    return 'AIRBORNE / MOMENTUM PRESERVED';
  };

  const getTraversalName = (t: TraversalState): string => {
    switch (t) {
      case TraversalState.Hanging:
        return 'HANG   ';
      case TraversalState.Mantling:
        return 'MANTLE ';
      case TraversalState.Vaulting:
        return 'VAULT  ';
      default:
        return 'NONE   ';
    }
  };

  const getFallName = (f: FallState): string => {
    switch (f) {
      case FallState.Parachuting:
        return 'PARACHUTING';
      case FallState.Airborne:
        return 'AIRBORNE   ';
      default:
        return 'GROUNDED   ';
    }
  };

  const pad = (n: number, width: number, precision: number = 2) => {
    const s = n.toFixed(precision);
    return s.padStart(width, ' ');
  };

  const formatEntity = (id: number) => `E${id.toString().padStart(4, '0')}`;

  const pos = snapshot.player_position;
  const vel = snapshot.player_linear_velocity;
  const sptVel = snapshot.support_point_linear_velocity;
  const valvePct = Math.round(snapshot.valve_open_fraction * 100);

  return (
    <div className="absolute inset-0 pointer-events-none p-4 md:p-6 font-mono text-[11px] md:text-[13px] leading-relaxed select-none overflow-hidden">
      {/* Top Left Telemetry Panel */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 max-w-[85vw] md:max-w-2xl bg-black/60 backdrop-blur-sm p-3 rounded border border-neutral-800 shadow-xl space-y-0.5">
        <div className="text-amber-300 font-bold text-sm md:text-base tracking-wide pb-1 border-b border-neutral-800">
          {getStatusText()}
        </div>

        <div className="text-neutral-300">
          POSITION &nbsp;{pad(pos.x, 8)} {pad(pos.y, 7)} {pad(pos.z, 8)} m
        </div>
        <div className="text-neutral-300">
          VELOCITY &nbsp;{pad(vel.x, 8)} {pad(vel.y, 7)} {pad(vel.z, 8)} m/s
        </div>
        <div className={snapshot.player_grounded ? 'text-amber-200' : 'text-amber-600'}>
          SUPPORT &nbsp;&nbsp;{snapshot.player_grounded ? 'GROUNDED' : 'AIRBORNE'} / {formatEntity(snapshot.support_entity_id)} / POINT V {pad(sptVel.x, 5)} {pad(sptVel.y, 5)} {pad(sptVel.z, 5)}
        </div>
        <div className="text-neutral-300">
          TRAVERSAL {getTraversalName(snapshot.traversal_state)} / {formatEntity(snapshot.traversal_support_entity_id)} / {Math.round(snapshot.traversal_progress * 100).toString().padStart(3, ' ')}% &nbsp;
          LEDGE {snapshot.ledge_available ? `${formatEntity(snapshot.ledge_entity_id)} +${snapshot.ledge_rise_meters.toFixed(2)}m` : ' --'}
        </div>
        <div className="text-neutral-300">
          PLANT &nbsp;&nbsp;&nbsp;&nbsp;CYCLE {pad(snapshot.machine_cycle_phase_seconds, 5, 1)}s &nbsp;TIPPER {snapshot.tipper_angle_radians >= 0 ? '+' : ''}{snapshot.tipper_angle_radians.toFixed(3)} rad &nbsp;VALVE {valvePct.toString().padStart(3, ' ')}% &nbsp;FLOW {snapshot.orifice_mass_flow_kg_per_s.toFixed(3)} kg/s
        </div>
        <div className="text-neutral-300">
          VESSEL &nbsp;&nbsp;&nbsp;{(snapshot.vessel_pressure_pa / 1e5).toFixed(2)} bar &nbsp;CYL {(snapshot.cylinder_pressure_pa / 1e5).toFixed(2)} bar &nbsp;PISTON {(snapshot.piston_force_n / 1000).toFixed(2)} kN &nbsp;STORE {(snapshot.vessel_available_energy_j / 1e6).toFixed(2)} MJ &nbsp;LIFT {snapshot.lift_platform_position.y.toFixed(2)} m
        </div>
        <div className={snapshot.fall_state === FallState.Parachuting ? 'text-emerald-300' : 'text-neutral-300'}>
          FALL &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{getFallName(snapshot.fall_state)} &nbsp;PEAK {pad(snapshot.fall_peak_speed_mps, 5, 1)} m/s &nbsp;CHUTE {snapshot.parachute_deployed ? 'DEPLOYED' : 'stowed'} &nbsp;CHECKPOINT {pad(snapshot.checkpoint_position.x, 6, 1)} {pad(snapshot.checkpoint_position.y, 5, 1)} {pad(snapshot.checkpoint_position.z, 6, 1)} &nbsp;COMMITS {snapshot.checkpoint_commit_count} &nbsp;DEATHS {snapshot.death_count}
        </div>
        <div className={snapshot.jib_station_active ? 'text-amber-200 font-semibold' : 'text-neutral-400'}>
          JIB &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{snapshot.jib_station_active ? 'AT PENDANT' : 'away      '} &nbsp;BOOM {snapshot.jib_boom_angle_radians >= 0 ? '+' : ''}{snapshot.jib_boom_angle_radians.toFixed(3)} rad &nbsp;HOOK {pad(snapshot.jib_hook_position.x, 6, 1)} {pad(snapshot.jib_hook_position.y, 5, 1)} {pad(snapshot.jib_hook_position.z, 6, 1)} &nbsp;CRATE {pad(snapshot.jib_crate_position.x, 6, 1)} {pad(snapshot.jib_crate_position.y, 5, 1)} {pad(snapshot.jib_crate_position.z, 6, 1)}
        </div>
        <div className={snapshot.needle_seated ? 'text-emerald-300 font-semibold' : 'text-neutral-400'}>
          NEEDLE &nbsp;&nbsp;&nbsp;{snapshot.needle_station_active ? 'AT PENDANT' : 'away      '} &nbsp;{snapshot.needle_seated ? 'SEATED  ' : 'unseated'} &nbsp;POS {pad(snapshot.needle_position.x, 6, 1)} {pad(snapshot.needle_position.y, 5, 1)} {pad(snapshot.needle_position.z, 6, 1)}
        </div>
        <div className={snapshot.grate_safe ? 'text-emerald-300' : 'text-orange-400 font-semibold'}>
          SUMP &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{snapshot.sump_station_active ? 'AT VALVE  ' : 'away      '} &nbsp;VALVE {snapshot.sump_isolated ? 'closed' : 'OPEN  '} &nbsp;VOLUME {pad(snapshot.sump_volume_kg, 6, 1)} kg &nbsp;GRATE {snapshot.grate_safe ? 'SAFE  ' : 'HAZARD'}
        </div>
      </div>

      {/* Top Right Tick and Tower Telemetry */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 bg-black/60 backdrop-blur-sm p-3 rounded border border-neutral-800 text-right space-y-1">
        <div className="text-amber-400 font-bold tracking-widest text-xs md:text-sm">
          SCRAPERX INDUSTRIAL SIM
        </div>
        <div className="text-neutral-300 text-xs">
          90 HZ NATIVE &nbsp;/&nbsp; TICK {snapshot.tick_index.toString().padStart(8, '0')} &nbsp;/&nbsp; TOWER {snapshot.tower_height_meters.toFixed(0)} m
        </div>
      </div>
    </div>
  );
};
