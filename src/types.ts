export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export enum InitialSpawn {
  StaticDeck = 0,
  TranslatingSupport = 1,
  RotatingSupport = 2,
  VaultApproach = 3,
  MantleApproach = 4,
  HangApproach = 5,
  MovingLedgeApproach = 6,
  BlockedLedgeApproach = 7,
  ExteriorGrade = 8,
  MachineYard = 9,
  LiftPlatform = 10,
  HighDrop = 11,
  SurvivableDrop = 12,
  CatwalkTreadle = 13,
  KernelJibStation = 14,
  KernelCrateTop = 15,
  KernelNeedleStation = 16,
  KernelSumpStation = 17,
}

export enum TraversalState {
  None = 0,
  Hanging = 1,
  Mantling = 2,
  Vaulting = 3,
}

export enum FallState {
  Grounded = 0,
  Airborne = 1,
  Parachuting = 2,
}

export interface SimulationSnapshot {
  tick_index: number;
  simulation_time_seconds: number;
  fixed_step_seconds: number;
  player_position: Vector3D;
  player_linear_velocity: Vector3D;
  player_grounded: boolean;
  support_entity_id: number;
  support_contact_point: Vector3D;
  support_point_linear_velocity: Vector3D;
  translating_support_position: Vector3D;
  translating_support_linear_velocity: Vector3D;
  rotating_support_position: Vector3D;
  rotating_support_yaw_radians: number;
  moving_ledge_position: Vector3D;

  traversal_state: TraversalState;
  traversal_support_entity_id: number;
  traversal_progress: number;
  traversal_target_point: Vector3D;
  ledge_available: boolean;
  ledge_entity_id: number;
  ledge_point: Vector3D;
  ledge_rise_meters: number;

  fall_state: FallState;
  fall_peak_speed_mps: number;
  last_impact_speed_mps: number;
  parachute_deployed: boolean;
  checkpoint_position: Vector3D;
  checkpoint_commit_count: number;
  death_count: number;

  // Plant & Machine
  hoist_scoop_position: Vector3D;
  hoist_scoop_tilt_radians: number;
  ballast_position: Vector3D;
  tipper_position: Vector3D;
  tipper_angle_radians: number;
  valve_lever_angle_radians: number;
  treadle_angle_radians: number;
  valve_open_fraction: number;
  rope_extension_meters: number;
  lift_platform_position: Vector3D;
  lift_platform_linear_velocity: Vector3D;
  counterweight_position: Vector3D;
  vessel_pressure_pa: number;
  cylinder_pressure_pa: number;
  orifice_mass_flow_kg_per_s: number;
  vented_mass_kg: number;
  piston_force_n: number;
  vessel_available_energy_j: number;
  machine_cycle_phase_seconds: number;
  tower_height_meters: number;

  // KX-JIB
  jib_station_active: boolean;
  jib_boom_angle_radians: number;
  jib_hook_position: Vector3D;
  jib_crate_position: Vector3D;
  jib_capacity_stand_load_position: Vector3D;

  // KX-NEEDLE
  needle_station_active: boolean;
  needle_seated: boolean;
  needle_position: Vector3D;

  // KX-SUMP
  sump_station_active: boolean;
  sump_isolated: boolean;
  sump_volume_kg: number;
  grate_safe: boolean;
}
