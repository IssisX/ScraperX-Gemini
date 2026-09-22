import { InitialSpawn, TraversalState, FallState, SimulationSnapshot, Vector3D } from '../types';
import { SteamPlant } from './steamPlant';

export class SimulationEngine {
  public static readonly kTickRateHz = 90;
  public static readonly kFixedStepSeconds = 1.0 / 90.0;
  public static readonly kTowerHeightMeters = 1600.0;

  // Entity IDs
  public static readonly kStaticDeckEntityId = 1;
  public static readonly kPlayerEntityId = 2;
  public static readonly kTranslatingSupportEntityId = 3;
  public static readonly kRotatingSupportEntityId = 4;
  public static readonly kVaultRailEntityId = 5;
  public static readonly kMantleLedgeEntityId = 6;
  public static readonly kHangLedgeEntityId = 7;
  public static readonly kMovingLedgeEntityId = 8;
  public static readonly kTipperEntityId = 14;
  public static readonly kLiftPlatformEntityId = 16;
  public static readonly kCatwalkEntityId = 19;
  public static readonly kTreadleEntityId = 24;
  public static readonly kJibHookEntityId = 27;
  public static readonly kCrateEntityId = 28;
  public static readonly kNeedleBeamEntityId = 33;
  public static readonly kSumpGrateEntityId = 34;

  private tickIndex = 0;
  private simulationTime = 0.0;
  private remainderSeconds = 0.0;

  // Controls input
  private moveInputX = 0.0;
  private moveInputZ = 0.0;
  private facingX = 0.0;
  private facingZ = -1.0;
  private jumpRequested = false;
  private traversalRequested = false;
  private releaseRequested = false;
  private parachuteRequested = false;
  private valveToggleRequested = false;
  private jibSlewInput = 0.0;
  private jibHoistInput = 0.0;
  private needleHoistInput = 0.0;

  // Player state
  private playerPos: Vector3D = { x: 0, y: 0.9, z: 0 };
  private playerVel: Vector3D = { x: 0, y: 0, z: 0 };
  private playerGrounded = true;
  private supportEntityId = 1;
  private supportContactPoint: Vector3D = { x: 0, y: 0, z: 0 };
  private supportPointVelocity: Vector3D = { x: 0, y: 0, z: 0 };

  // Traversal state
  private traversalState = TraversalState.None;
  private traversalSupportEntityId = 0;
  private traversalTargetPoint: Vector3D = { x: 0, y: 0, z: 0 };
  private traversalStartPoint: Vector3D = { x: 0, y: 0, z: 0 };
  private traversalProgress = 0.0;
  private traversalDuration = 0.4;
  private ledgeAvailable = false;
  private ledgeEntityId = 0;
  private ledgePoint: Vector3D = { x: 0, y: 0, z: 0 };
  private ledgeRiseMeters = 0.0;
  private releaseLockoutTicks = 0;
  private acceptedTraversalCount = 0;
  private rejectedTraversalCount = 0;
  private abortedTraversalCount = 0;

  // Fall & Checkpoint
  private fallState = FallState.Grounded;
  private fallPeakSpeedMps = 0.0;
  private lastImpactSpeedMps = 0.0;
  private parachuteDeployed = false;
  private checkpointPos: Vector3D = { x: 0, y: 0.9, z: 0 };
  private checkpointCommitCount = 1;
  private deathCount = 0;

  // Moving supports
  private translatingPos: Vector3D = { x: -8.0, y: 0.5, z: -20.0 };
  private translatingVel: Vector3D = { x: 0, y: 0, z: 0 };
  private rotatingPos: Vector3D = { x: 8.0, y: 0.5, z: -20.0 };
  private rotatingYaw = 0.0;
  private movingLedgePos: Vector3D = { x: -4.0, y: 3.5, z: 12.5 };

  // Coupled Machine & Steam Plant
  public steamPlant = new SteamPlant();
  private machinePhaseSeconds = 0.0;
  private scoopPos: Vector3D = { x: 34.0, y: 0.03, z: -96.0 };
  private scoopTilt = 0.0;
  private ballastPos: Vector3D = { x: 34.0, y: 0.03, z: -96.0 };
  private tipperPos: Vector3D = { x: 29.0, y: 3.6, z: -96.0 };
  private tipperAngle = 0.0;
  private valveLeverAngle = -0.05;
  private treadleAngle = 0.0;
  private liftPlatformPos: Vector3D = { x: 16.4, y: 1.2, z: -100.0 };
  private liftPlatformVel: Vector3D = { x: 0, y: 0, z: 0 };
  private counterweightPos: Vector3D = { x: 11.6, y: 8.8, z: -100.0 };
  private ropeExtension = 0.0;

  // KX-JIB
  private jibStationActive = false;
  private jibBoomAngle = 0.0;
  private jibHookPos: Vector3D = { x: 206.0, y: 2.5, z: 0.0 };
  private jibCratePos: Vector3D = { x: 206.0, y: 0.75, z: 0.0 };
  private jibCapacityLoadPos: Vector3D = { x: 208.0, y: 0.6, z: 6.0 };

  // KX-NEEDLE
  private needleStationActive = false;
  private needleSeated = false;
  private needlePos: Vector3D = { x: 200.0, y: 7.0, z: -16.0 };
  private needleVel: Vector3D = { x: 0, y: 0, z: 0 };

  // KX-SUMP
  private sumpStationActive = false;
  private sumpIsolated = false;
  private sumpVolumeKg = 200.0;
  private grateSafe = false;

  constructor(initialSpawn: InitialSpawn = InitialSpawn.ExteriorGrade) {
    this.configureInitialSpawn(initialSpawn);
  }

  public configureInitialSpawn(spawn: InitialSpawn): void {
    switch (spawn) {
      case InitialSpawn.StaticDeck:
        this.playerPos = { x: 0.0, y: 0.9, z: 0.0 };
        break;
      case InitialSpawn.TranslatingSupport:
        this.playerPos = { x: -8.0, y: 1.5, z: -20.0 };
        break;
      case InitialSpawn.RotatingSupport:
        this.playerPos = { x: 8.0, y: 1.5, z: -20.0 };
        break;
      case InitialSpawn.VaultApproach:
        this.playerPos = { x: 0.0, y: 0.9, z: -8.0 };
        this.facingZ = -1.0;
        break;
      case InitialSpawn.MantleApproach:
        this.playerPos = { x: 5.0, y: 0.9, z: -8.0 };
        this.facingZ = -1.0;
        break;
      case InitialSpawn.HangApproach:
        this.playerPos = { x: -5.0, y: 0.9, z: -8.0 };
        this.facingZ = -1.0;
        break;
      case InitialSpawn.ExteriorGrade:
        this.playerPos = { x: 0.0, y: 0.9, z: 30.0 };
        this.facingZ = -1.0;
        break;
      case InitialSpawn.MachineYard:
        this.playerPos = { x: 22.0, y: 0.9, z: -88.0 };
        this.facingZ = -1.0;
        break;
      case InitialSpawn.LiftPlatform:
        this.playerPos = { x: 16.4, y: 2.1, z: -100.0 };
        break;
      case InitialSpawn.HighDrop:
        this.playerPos = { x: 0.0, y: 140.0, z: -40.0 };
        this.playerGrounded = false;
        break;
      case InitialSpawn.SurvivableDrop:
        this.playerPos = { x: 0.0, y: 11.0, z: -40.0 };
        this.playerGrounded = false;
        break;
      case InitialSpawn.CatwalkTreadle:
        this.playerPos = { x: 16.4, y: 9.6, z: -106.0 };
        break;
      case InitialSpawn.KernelJibStation:
        this.playerPos = { x: 197.5, y: 0.9, z: -2.0 };
        break;
      case InitialSpawn.KernelCrateTop:
        this.playerPos = { x: 206.0, y: 1.65, z: 0.0 };
        break;
      case InitialSpawn.KernelNeedleStation:
        this.playerPos = { x: 200.0, y: 4.9, z: -13.0 };
        break;
      case InitialSpawn.KernelSumpStation:
        this.playerPos = { x: 200.0, y: 0.9, z: 14.0 };
        break;
      default:
        this.playerPos = { x: 0.0, y: 0.9, z: 30.0 };
    }
    this.playerVel = { x: 0, y: 0, z: 0 };
    this.checkpointPos = { ...this.playerPos };
    this.fallState = this.playerGrounded ? FallState.Grounded : FallState.Airborne;
  }

  public setMoveInput(x: number, z: number): boolean {
    const len = Math.hypot(x, z);
    if (len > 1.0) {
      this.moveInputX = x / len;
      this.moveInputZ = z / len;
    } else {
      this.moveInputX = x;
      this.moveInputZ = z;
    }
    return true;
  }

  public setFacing(x: number, z: number): boolean {
    const len = Math.hypot(x, z);
    if (len > 0.001) {
      this.facingX = x / len;
      this.facingZ = z / len;
    }
    return true;
  }

  public requestJump(): boolean {
    this.jumpRequested = true;
    return true;
  }

  public requestTraversal(): boolean {
    this.traversalRequested = true;
    return true;
  }

  public requestRelease(): boolean {
    this.releaseRequested = true;
    return true;
  }

  public requestParachute(): boolean {
    this.parachuteRequested = true;
    return true;
  }

  public requestValveToggle(): boolean {
    this.valveToggleRequested = true;
    return true;
  }

  public setJibSlewInput(val: number): boolean {
    this.jibSlewInput = Math.max(-1.0, Math.min(1.0, val));
    return true;
  }

  public setJibHoistInput(val: number): boolean {
    this.jibHoistInput = Math.max(-1.0, Math.min(1.0, val));
    return true;
  }

  public setNeedleHoistInput(val: number): boolean {
    this.needleHoistInput = Math.max(-1.0, Math.min(1.0, val));
    return true;
  }

  public advanceFrame(deltaSeconds: number): number {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return 0;
    const clampedDelta = Math.min(deltaSeconds, 0.1);
    this.remainderSeconds += clampedDelta;

    let steps = 0;
    while (this.remainderSeconds >= SimulationEngine.kFixedStepSeconds) {
      this.stepFixed();
      this.remainderSeconds -= SimulationEngine.kFixedStepSeconds;
      steps++;
    }
    return steps;
  }

  private stepFixed(): void {
    const dt = SimulationEngine.kFixedStepSeconds;
    this.tickIndex++;
    this.simulationTime += dt;

    if (this.releaseLockoutTicks > 0) {
      this.releaseLockoutTicks--;
    }

    // Update moving supports kinematics
    this.updateMovingSupports(dt);

    // Update coupled machine & steam plant
    this.updateCoupledMachine(dt);

    // Update kernel stations (KX-JIB, KX-NEEDLE, KX-SUMP)
    this.updateKernelSystems(dt);

    // Update player locomotion & traversal
    this.updatePlayer(dt);

    // Reset single-frame requests
    this.jumpRequested = false;
    this.traversalRequested = false;
    this.releaseRequested = false;
    this.parachuteRequested = false;
    this.valveToggleRequested = false;
  }

  private updateMovingSupports(dt: number): void {
    // Translating support: x = -8 + 2 * sin(1.0 * t)
    const prevTransX = this.translatingPos.x;
    this.translatingPos.x = -8.0 + 2.0 * Math.sin(1.0 * this.simulationTime);
    this.translatingVel.x = (this.translatingPos.x - prevTransX) / dt;

    // Rotating support: yaw increases at 0.8 rad/s
    this.rotatingYaw += 0.8 * dt;

    // Moving ledge: z = 12.5 + 1.5 * sin(0.9 * t)
    this.movingLedgePos.z = 12.5 + 1.5 * Math.sin(0.9 * this.simulationTime);
  }

  private updateCoupledMachine(dt: number): void {
    const cyclePeriod = 26.0;
    this.machinePhaseSeconds = this.simulationTime % cyclePeriod;
    const t = this.machinePhaseSeconds;

    // Scoop movement:
    // 0..8s: rises from 0.03 to 12.0
    // 8..12s: tilts to 0.62 rad to discharge ballast
    // 12..20s: descends back
    // 20..26s: sits at bottom loading next ballast
    if (t < 8.0) {
      const frac = t / 8.0;
      this.scoopPos.y = 0.03 + (12.0 - 0.03) * frac;
      this.scoopTilt = 0.0;
      this.ballastPos = { ...this.scoopPos };
    } else if (t < 12.0) {
      this.scoopPos.y = 12.0;
      const tiltFrac = (t - 8.0) / 2.0;
      this.scoopTilt = Math.min(0.62, tiltFrac * 0.62);
      // Ballast falls into tipper
      const dropFrac = (t - 8.0) / 4.0;
      this.ballastPos = {
        x: 34.0 - dropFrac * 5.0,
        y: 12.0 - dropFrac * 8.4,
        z: -96.0,
      };
    } else if (t < 20.0) {
      const frac = (t - 12.0) / 8.0;
      this.scoopPos.y = 12.0 - (12.0 - 0.03) * frac;
      this.scoopTilt = 0.0;
      this.ballastPos = { x: 29.0, y: 3.6, z: -96.0 };
    } else {
      this.scoopPos.y = 0.03;
      this.scoopTilt = 0.0;
      this.ballastPos = { ...this.scoopPos };
    }

    // Tipper angle:
    // Ballast in tipper between t=10 and t=19
    let tipperTargetAngle = 0.0;
    if (t >= 10.0 && t < 19.0) {
      tipperTargetAngle = 0.48; // tipped
    }

    // If player stands on tipper (x in [27, 31], z in [-98, -94], y near 3.6), their weight tilts it!
    const onTipper =
      Math.abs(this.playerPos.x - 29.0) < 2.0 &&
      Math.abs(this.playerPos.z - (-96.0)) < 2.0 &&
      Math.abs(this.playerPos.y - 4.5) < 1.0;
    if (onTipper) {
      tipperTargetAngle = Math.max(tipperTargetAngle, 0.52);
    }

    this.tipperAngle += (tipperTargetAngle - this.tipperAngle) * Math.min(1.0, 4.0 * dt);

    // Treadle on catwalk:
    // Treadle is at x=16.4, y=9.09, z=-106.0.
    // If player stands on treadle (x in [15.2, 17.6], z in [-107.5, -104.5], y in [9.0, 10.5]), body weight depresses it!
    const onTreadle =
      Math.abs(this.playerPos.x - 16.4) < 1.3 &&
      Math.abs(this.playerPos.z - (-106.0)) < 1.5 &&
      Math.abs(this.playerPos.y - 9.8) < 0.9;

    let treadleTarget = 0.0;
    if (onTreadle) {
      treadleTarget = 0.24; // depressed
    }
    this.treadleAngle += (treadleTarget - this.treadleAngle) * Math.min(1.0, 8.0 * dt);

    // Valve lever angle driven by either tipper rope or treadle cable:
    const tipperDrive = Math.max(0.0, (this.tipperAngle - 0.08) * 1.3);
    const treadleDrive = (this.treadleAngle / 0.24) * 0.62;
    const targetValveAngle = Math.max(tipperDrive, treadleDrive) - 0.05;
    this.valveLeverAngle += (targetValveAngle - this.valveLeverAngle) * Math.min(1.0, 6.0 * dt);

    // Valve fraction in [0, 1]
    const valveFrac = Math.max(0.0, Math.min(1.0, (this.valveLeverAngle - -0.05) / 0.67));
    this.steamPlant.setValveOpenFraction(valveFrac);
    this.steamPlant.step(dt);

    // Lift Platform physics:
    // Piston force pushes up against platform mass + counterweight
    // Travel up to 7.6m (rest y = 1.2, max y = 8.8)
    const pistonForce = this.steamPlant.pistonForceN;
    // Piston force of ~14kN lifts platform
    const targetLiftY = 1.2 + Math.min(7.6, (pistonForce / 14000.0) * 7.6);
    const prevLiftY = this.liftPlatformPos.y;
    this.liftPlatformPos.y += (targetLiftY - this.liftPlatformPos.y) * Math.min(1.0, 1.8 * dt);
    this.liftPlatformVel.y = (this.liftPlatformPos.y - prevLiftY) / dt;

    // Counterweight moves inversely
    this.counterweightPos.y = 8.8 - (this.liftPlatformPos.y - 1.2);
  }

  private updateKernelSystems(dt: number): void {
    // 1. KX-JIB Crane
    const distToJibStation = Math.hypot(
      this.playerPos.x - 197.5,
      this.playerPos.z - (-2.0)
    );
    this.jibStationActive = distToJibStation <= 2.5;

    if (this.jibStationActive) {
      // Slew
      this.jibBoomAngle += this.jibSlewInput * 0.5 * dt;
      this.jibBoomAngle = Math.max(-2.0, Math.min(2.0, this.jibBoomAngle));

      // Hoist
      this.jibHookPos.y += this.jibHoistInput * 1.0 * dt;
      this.jibHookPos.y = Math.max(1.2, Math.min(4.8, this.jibHookPos.y));
    }

    // Hook follows boom tip (boom length 6m from x=200, z=0)
    const boomTipX = 200.0 + 6.0 * Math.cos(this.jibBoomAngle);
    const boomTipZ = 0.0 - 6.0 * Math.sin(this.jibBoomAngle);
    this.jibHookPos.x = boomTipX;
    this.jibHookPos.z = boomTipZ;

    // Crate hangs below hook (height 1.5m -> center 0.75m below hook)
    this.jibCratePos.x = boomTipX;
    this.jibCratePos.z = boomTipZ;
    this.jibCratePos.y = Math.max(0.75, this.jibHookPos.y - 0.75);

    // 2. KX-NEEDLE Beam
    const distToNeedleStation = Math.hypot(
      this.playerPos.x - 200.0,
      this.playerPos.z - (-13.0)
    );
    this.needleStationActive = distToNeedleStation <= 2.5;

    if (this.needleStationActive && !this.needleSeated) {
      this.needlePos.y += this.needleHoistInput * 0.8 * dt;
      this.needlePos.y = Math.max(4.0, Math.min(7.2, this.needlePos.y));
      if (Math.abs(this.needlePos.y - 4.0) < 0.05) {
        this.needlePos.y = 4.0;
        this.needleSeated = true; // Beam firmly seated into pockets!
      }
    }

    // 3. KX-SUMP
    const distToSumpStation = Math.hypot(
      this.playerPos.x - 200.0,
      this.playerPos.z - 14.0
    );
    this.sumpStationActive = distToSumpStation <= 2.5;

    if (this.sumpStationActive && this.valveToggleRequested) {
      this.sumpIsolated = !this.sumpIsolated;
    }

    if (this.sumpIsolated) {
      // Draining
      this.sumpVolumeKg = Math.max(0.0, this.sumpVolumeKg - 16.0 * dt);
    } else {
      // Filling back up from process line
      this.sumpVolumeKg = Math.min(200.0, this.sumpVolumeKg + 12.0 * dt);
    }
    this.grateSafe = this.sumpVolumeKg < 5.0;
  }

  private updatePlayer(dt: number): void {
    // If in traversal animation (vault/mantle/hang), update animation
    if (this.traversalState !== TraversalState.None) {
      this.updateTraversalProgress(dt);
      return;
    }

    // 1. Detect Ledges / Obstacles ahead
    this.detectLedges();

    // 2. Traversal trigger
    if (this.traversalRequested && this.ledgeAvailable && this.releaseLockoutTicks === 0) {
      this.startTraversal();
      return;
    }

    // 3. Parachute trigger
    if (this.parachuteRequested) {
      if (!this.playerGrounded) {
        this.parachuteDeployed = !this.parachuteDeployed;
      }
    }

    // 4. Locomotion Movement
    const maxSpeed = 5.5;
    const accel = this.playerGrounded ? 22.0 : 8.0;

    // Movement relative to facing
    // forward is (facingX, facingZ)
    // right is (-facingZ, facingX)
    const moveWorldX = -this.facingZ * this.moveInputX + this.facingX * this.moveInputZ;
    const moveWorldZ = this.facingX * this.moveInputX + this.facingZ * this.moveInputZ;

    const targetVelX = moveWorldX * maxSpeed;
    const targetVelZ = moveWorldZ * maxSpeed;

    this.playerVel.x += (targetVelX - this.playerVel.x) * Math.min(1.0, accel * dt);
    this.playerVel.z += (targetVelZ - this.playerVel.z) * Math.min(1.0, accel * dt);

    // Gravity & Vertical velocity
    const gravity = -9.81;
    if (!this.playerGrounded) {
      let dragAcc = 0;
      if (this.parachuteDeployed) {
        // Terminal velocity ~ -4.5 m/s with parachute
        const targetFall = -4.5;
        this.playerVel.y += (targetFall - this.playerVel.y) * Math.min(1.0, 5.0 * dt);
      } else {
        this.playerVel.y += gravity * dt;
      }
      this.fallPeakSpeedMps = Math.max(this.fallPeakSpeedMps, -this.playerVel.y);
      this.fallState = this.parachuteDeployed ? FallState.Parachuting : FallState.Airborne;
    } else {
      this.fallState = FallState.Grounded;
      if (this.jumpRequested) {
        this.playerVel.y = 5.5; // Jump impulse
        this.playerGrounded = false;
        this.fallState = FallState.Airborne;
        this.fallPeakSpeedMps = 0.0;
      }
    }

    // Apply moving support attachment if grounded on a moving entity
    this.applySupportAttachment(dt);

    // Move position
    this.playerPos.x += this.playerVel.x * dt;
    this.playerPos.y += this.playerVel.y * dt;
    this.playerPos.z += this.playerVel.z * dt;

    // Ground & Environment Collision resolution
    this.resolveWorldCollisions();

    // Checkpoint management
    if (this.playerGrounded && this.playerPos.y >= 0.8 && this.playerVel.y <= 0.1) {
      // Commit checkpoint if on major safe decks
      if (
        Math.hypot(
          this.playerPos.x - this.checkpointPos.x,
          this.playerPos.z - this.checkpointPos.z
        ) > 12.0
      ) {
        this.checkpointPos = { ...this.playerPos };
        this.checkpointCommitCount++;
      }
    }

    // Lethal fall or void fall check
    if (this.playerPos.y < -30.0) {
      this.respawnAtCheckpoint();
    }
  }

  private detectLedges(): void {
    this.ledgeAvailable = false;
    this.ledgeRiseMeters = 0.0;

    // Check forward 1.2m
    const probeX = this.playerPos.x + this.facingX * 1.1;
    const probeZ = this.playerPos.z + this.facingZ * 1.1;

    // Check against vault rails, mantle ledges, stack decks
    // Example: Vault rail near z=-10, Mantle near z=-12, Catwalk rail, etc.
    if (Math.abs(probeZ - (-10.0)) < 1.2 && Math.abs(probeX) < 4.0) {
      this.ledgeAvailable = true;
      this.ledgeEntityId = SimulationEngine.kVaultRailEntityId;
      this.ledgeRiseMeters = 0.85;
      this.ledgePoint = { x: probeX, y: this.playerPos.y + 0.85, z: -10.0 };
    } else if (Math.abs(probeZ - (-14.0)) < 1.2 && Math.abs(probeX - 5.0) < 3.0) {
      this.ledgeAvailable = true;
      this.ledgeEntityId = SimulationEngine.kMantleLedgeEntityId;
      this.ledgeRiseMeters = 1.45;
      this.ledgePoint = { x: probeX, y: this.playerPos.y + 1.45, z: -14.0 };
    }
  }

  private startTraversal(): void {
    if (this.ledgeRiseMeters <= 1.1) {
      // Vault
      this.traversalState = TraversalState.Vaulting;
      this.traversalDuration = 0.38;
      this.traversalStartPoint = { ...this.playerPos };
      this.traversalTargetPoint = {
        x: this.playerPos.x + this.facingX * 2.0,
        y: this.ledgePoint.y - 0.85 + 0.9,
        z: this.playerPos.z + this.facingZ * 2.0,
      };
      this.acceptedTraversalCount++;
    } else {
      // Mantle
      this.traversalState = TraversalState.Mantling;
      this.traversalDuration = 0.42;
      this.traversalStartPoint = { ...this.playerPos };
      this.traversalTargetPoint = {
        x: this.ledgePoint.x + this.facingX * 0.4,
        y: this.ledgePoint.y + 0.9,
        z: this.ledgePoint.z + this.facingZ * 0.4,
      };
      this.acceptedTraversalCount++;
    }
    this.traversalProgress = 0.0;
  }

  private updateTraversalProgress(dt: number): void {
    this.traversalProgress += dt / this.traversalDuration;
    if (this.releaseRequested) {
      // Abort
      this.traversalState = TraversalState.None;
      this.abortedTraversalCount++;
      this.releaseLockoutTicks = 27;
      return;
    }

    if (this.traversalProgress >= 1.0) {
      this.traversalProgress = 1.0;
      this.playerPos = { ...this.traversalTargetPoint };
      this.playerVel = { x: 0, y: 0, z: 0 };
      this.playerGrounded = true;
      this.traversalState = TraversalState.None;
      return;
    }

    const t = this.traversalProgress;
    // Smooth bezier or sin interpolation
    const ease = 0.5 - 0.5 * Math.cos(t * Math.PI);
    this.playerPos.x =
      this.traversalStartPoint.x +
      (this.traversalTargetPoint.x - this.traversalStartPoint.x) * ease;
    this.playerPos.z =
      this.traversalStartPoint.z +
      (this.traversalTargetPoint.z - this.traversalStartPoint.z) * ease;
    // Peak in middle for vault
    const peak =
      this.traversalState === TraversalState.Vaulting ? Math.sin(t * Math.PI) * 0.25 : 0;
    this.playerPos.y =
      this.traversalStartPoint.y +
      (this.traversalTargetPoint.y - this.traversalStartPoint.y) * ease +
      peak;
  }

  private applySupportAttachment(dt: number): void {
    if (!this.playerGrounded) {
      this.supportPointVelocity = { x: 0, y: 0, z: 0 };
      return;
    }

    // Check which support the player is on
    if (this.supportEntityId === SimulationEngine.kTranslatingSupportEntityId) {
      this.supportPointVelocity = { ...this.translatingVel };
      this.playerPos.x += this.translatingVel.x * dt;
    } else if (this.supportEntityId === SimulationEngine.kRotatingSupportEntityId) {
      // Rotating velocity v = omega x r
      const rx = this.playerPos.x - this.rotatingPos.x;
      const rz = this.playerPos.z - this.rotatingPos.z;
      const omega = 0.8;
      const vx = -omega * rz;
      const vz = omega * rx;
      this.supportPointVelocity = { x: vx, y: 0, z: vz };
      this.playerPos.x += vx * dt;
      this.playerPos.z += vz * dt;
    } else if (this.supportEntityId === SimulationEngine.kLiftPlatformEntityId) {
      this.supportPointVelocity = { ...this.liftPlatformVel };
      this.playerPos.y = this.liftPlatformPos.y + 0.9;
    } else if (this.supportEntityId === SimulationEngine.kCrateEntityId) {
      this.playerPos.x = this.jibCratePos.x;
      this.playerPos.z = this.jibCratePos.z;
      this.playerPos.y = this.jibCratePos.y + 0.75 + 0.9;
    } else {
      this.supportPointVelocity = { x: 0, y: 0, z: 0 };
    }
  }

  private resolveWorldCollisions(): void {
    let groundY = 0.9; // Default grade floor (player capsule center y at 0.9)
    let groundEntity = SimulationEngine.kStaticDeckEntityId;

    // Check Translating support
    if (
      Math.abs(this.playerPos.x - this.translatingPos.x) < 2.0 &&
      Math.abs(this.playerPos.z - this.translatingPos.z) < 2.0 &&
      this.playerPos.y >= this.translatingPos.y
    ) {
      groundY = this.translatingPos.y + 0.9;
      groundEntity = SimulationEngine.kTranslatingSupportEntityId;
    }
    // Check Rotating support
    else if (
      Math.abs(this.playerPos.x - this.rotatingPos.x) < 2.5 &&
      Math.abs(this.playerPos.z - this.rotatingPos.z) < 2.5 &&
      this.playerPos.y >= this.rotatingPos.y
    ) {
      groundY = this.rotatingPos.y + 0.9;
      groundEntity = SimulationEngine.kRotatingSupportEntityId;
    }
    // Check Lift platform
    else if (
      Math.abs(this.playerPos.x - this.liftPlatformPos.x) < 2.2 &&
      Math.abs(this.playerPos.z - this.liftPlatformPos.z) < 2.2 &&
      this.playerPos.y >= this.liftPlatformPos.y + 0.2
    ) {
      groundY = this.liftPlatformPos.y + 0.9;
      groundEntity = SimulationEngine.kLiftPlatformEntityId;
    }
    // Check Catwalk
    else if (
      Math.abs(this.playerPos.x - 16.4) < 3.5 &&
      this.playerPos.z <= -102.0 &&
      this.playerPos.z >= -115.0 &&
      this.playerPos.y >= 8.69
    ) {
      groundY = 8.69 + 0.9;
      groundEntity = SimulationEngine.kCatwalkEntityId;
      // On treadle?
      if (
        Math.abs(this.playerPos.x - 16.4) < 1.3 &&
        Math.abs(this.playerPos.z - (-106.0)) < 1.5
      ) {
        groundEntity = SimulationEngine.kTreadleEntityId;
      }
    }
    // Check Tipper
    else if (
      Math.abs(this.playerPos.x - 29.0) < 2.2 &&
      Math.abs(this.playerPos.z - (-96.0)) < 2.2 &&
      this.playerPos.y >= 3.6
    ) {
      groundY = 3.6 + 0.9;
      groundEntity = SimulationEngine.kTipperEntityId;
    }
    // Check KX-CRATE
    else if (
      Math.abs(this.playerPos.x - this.jibCratePos.x) < 0.85 &&
      Math.abs(this.playerPos.z - this.jibCratePos.z) < 0.85 &&
      this.playerPos.y >= this.jibCratePos.y + 0.6
    ) {
      groundY = this.jibCratePos.y + 0.75 + 0.9;
      groundEntity = SimulationEngine.kCrateEntityId;
    }
    // Check KX-NEEDLE Beam
    else if (
      this.needleSeated &&
      Math.abs(this.playerPos.x - 200.0) < 1.5 &&
      Math.abs(this.playerPos.z - (-16.0)) < 2.5 &&
      this.playerPos.y >= 4.0
    ) {
      groundY = 4.0 + 0.9;
      groundEntity = SimulationEngine.kNeedleBeamEntityId;
    }
    // Check Needle piers
    else if (
      Math.abs(this.playerPos.x - 200.0) < 2.5 &&
      (Math.abs(this.playerPos.z - (-13.0)) < 1.6 || Math.abs(this.playerPos.z - (-19.0)) < 1.6) &&
      this.playerPos.y >= 4.0
    ) {
      groundY = 4.0 + 0.9;
      groundEntity = SimulationEngine.kStaticDeckEntityId;
    }
    // Check KX-SUMP Grate
    else if (
      Math.abs(this.playerPos.x - 200.0) < 2.5 &&
      Math.abs(this.playerPos.z - 16.0) < 2.5
    ) {
      if (this.grateSafe) {
        groundY = 0.9;
        groundEntity = SimulationEngine.kSumpGrateEntityId;
      } else {
        // Falls through wet hazard into bottom basin at y = -2.5
        groundY = -2.5 + 0.9;
        groundEntity = SimulationEngine.kStaticDeckEntityId;
      }
    }
    // Check Tower stack levels
    else if (
      Math.abs(this.playerPos.x) < 26.0 &&
      this.playerPos.z <= -124.0 &&
      this.playerPos.z >= -176.0
    ) {
      // Find nearest deck level (every 11m)
      const level = Math.floor((this.playerPos.y + 0.5) / 11.0);
      if (level >= 1 && level <= 14) {
        const deckY = level * 11.0 + 0.9;
        if (this.playerPos.y >= deckY - 0.4) {
          groundY = deckY;
          groundEntity = SimulationEngine.kStaticDeckEntityId;
        }
      }
    }

    if (this.playerPos.y <= groundY + 0.05) {
      if (!this.playerGrounded) {
        // Landing impact
        this.lastImpactSpeedMps = -this.playerVel.y;
        if (this.lastImpactSpeedMps > 18.0) {
          // Lethal impact!
          this.respawnAtCheckpoint();
          return;
        }
      }
      this.playerPos.y = groundY;
      this.playerVel.y = 0;
      this.playerGrounded = true;
      this.supportEntityId = groundEntity;
      this.parachuteDeployed = false;
    } else {
      this.playerGrounded = false;
    }
  }

  private respawnAtCheckpoint(): void {
    this.deathCount++;
    this.playerPos = { ...this.checkpointPos };
    this.playerVel = { x: 0, y: 0, z: 0 };
    this.playerGrounded = true;
    this.fallState = FallState.Grounded;
    this.parachuteDeployed = false;
    this.fallPeakSpeedMps = 0.0;
  }

  public getSnapshot(): SimulationSnapshot {
    return {
      tick_index: this.tickIndex,
      simulation_time_seconds: this.simulationTime,
      fixed_step_seconds: SimulationEngine.kFixedStepSeconds,
      player_position: { ...this.playerPos },
      player_linear_velocity: { ...this.playerVel },
      player_grounded: this.playerGrounded,
      support_entity_id: this.supportEntityId,
      support_contact_point: { ...this.supportContactPoint },
      support_point_linear_velocity: { ...this.supportPointVelocity },
      translating_support_position: { ...this.translatingPos },
      translating_support_linear_velocity: { ...this.translatingVel },
      rotating_support_position: { ...this.rotatingPos },
      rotating_support_yaw_radians: this.rotatingYaw,
      moving_ledge_position: { ...this.movingLedgePos },

      traversal_state: this.traversalState,
      traversal_support_entity_id: this.traversalSupportEntityId,
      traversal_progress: this.traversalProgress,
      traversal_target_point: { ...this.traversalTargetPoint },
      ledge_available: this.ledgeAvailable,
      ledge_entity_id: this.ledgeEntityId,
      ledge_point: { ...this.ledgePoint },
      ledge_rise_meters: this.ledgeRiseMeters,

      fall_state: this.fallState,
      fall_peak_speed_mps: this.fallPeakSpeedMps,
      last_impact_speed_mps: this.lastImpactSpeedMps,
      parachute_deployed: this.parachuteDeployed,
      checkpoint_position: { ...this.checkpointPos },
      checkpoint_commit_count: this.checkpointCommitCount,
      death_count: this.deathCount,

      hoist_scoop_position: { ...this.scoopPos },
      hoist_scoop_tilt_radians: this.scoopTilt,
      ballast_position: { ...this.ballastPos },
      tipper_position: { ...this.tipperPos },
      tipper_angle_radians: this.tipperAngle,
      valve_lever_angle_radians: this.valveLeverAngle,
      treadle_angle_radians: this.treadleAngle,
      valve_open_fraction: this.steamPlant.valveOpenFraction,
      rope_extension_meters: this.ropeExtension,
      lift_platform_position: { ...this.liftPlatformPos },
      lift_platform_linear_velocity: { ...this.liftPlatformVel },
      counterweight_position: { ...this.counterweightPos },
      vessel_pressure_pa: this.steamPlant.vesselPressurePa,
      cylinder_pressure_pa: this.steamPlant.cylinderPressurePa,
      orifice_mass_flow_kg_per_s: this.steamPlant.orificeMassFlowKgPerS,
      vented_mass_kg: this.steamPlant.ventedMassKg,
      piston_force_n: this.steamPlant.pistonForceN,
      vessel_available_energy_j: this.steamPlant.vesselAvailableEnergyJ(),
      machine_cycle_phase_seconds: this.machinePhaseSeconds,
      tower_height_meters: SimulationEngine.kTowerHeightMeters,

      jib_station_active: this.jibStationActive,
      jib_boom_angle_radians: this.jibBoomAngle,
      jib_hook_position: { ...this.jibHookPos },
      jib_crate_position: { ...this.jibCratePos },
      jib_capacity_stand_load_position: { ...this.jibCapacityLoadPos },

      needle_station_active: this.needleStationActive,
      needle_seated: this.needleSeated,
      needle_position: { ...this.needlePos },

      sump_station_active: this.sumpStationActive,
      sump_isolated: this.sumpIsolated,
      sump_volume_kg: this.sumpVolumeKg,
      grate_safe: this.grateSafe,
    };
  }
}
