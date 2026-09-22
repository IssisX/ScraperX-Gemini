import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SimulationEngine } from '../sim/simulationEngine';
import { SimulationSnapshot } from '../types';

interface Viewport3DProps {
  engine: SimulationEngine;
  onSnapshot: (snap: SimulationSnapshot) => void;
  lookDeltaRef: React.MutableRefObject<{ x: number; y: number }>;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({ engine, onSnapshot, lookDeltaRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const yawRef = useRef<number>(0.0);
  const pitchRef = useRef<number>(-0.02);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e0d0c);
    scene.fog = new THREE.FogExp2(0x131210, 0.0022);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      70,
      container.clientWidth / container.clientHeight,
      0.1,
      2500
    );

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xd4cdc3, 0.55);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffeed6, 1.4);
    sunLight.position.set(120, 320, 80);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 600;
    const d = 160;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // Materials (matching Godot industrial palette)
    const matAsphalt = new THREE.MeshStandardMaterial({ color: 0x17150f, roughness: 0.9, metalness: 0.06 });
    const matConcrete = new THREE.MeshStandardMaterial({ color: 0x4e4841, roughness: 0.94, metalness: 0.0 });
    const matMillScale = new THREE.MeshStandardMaterial({ color: 0x1d1a17, roughness: 0.6, metalness: 0.72 });
    const matOxidised = new THREE.MeshStandardMaterial({ color: 0x6b3520, roughness: 0.92, metalness: 0.3 });
    const matRustDeep = new THREE.MeshStandardMaterial({ color: 0x3b1f13, roughness: 0.95, metalness: 0.28 });
    const matGalvanised = new THREE.MeshStandardMaterial({ color: 0x5a5d5e, roughness: 0.5, metalness: 0.66 });
    const matFadedYellow = new THREE.MeshStandardMaterial({ color: 0xb08a22, roughness: 0.68, metalness: 0.16 });
    const matHazard = new THREE.MeshStandardMaterial({ color: 0xa04d16, roughness: 0.76, metalness: 0.18 });
    const matTimber = new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 0.9, metalness: 0.02 });
    const matWindowLit = new THREE.MeshStandardMaterial({
      color: 0x2a2118,
      emissive: 0xffb45c,
      emissiveIntensity: 2.2,
      roughness: 0.3,
    });
    const matSafeGrate = new THREE.MeshStandardMaterial({ color: 0x4a7c6d, roughness: 0.5, metalness: 0.6 });
    const matHazardGrate = new THREE.MeshStandardMaterial({
      color: 0x8a4520,
      roughness: 0.4,
      metalness: 0.5,
      emissive: 0x552010,
      emissiveIntensity: 0.8,
    });

    // 1. Grade Ground
    const groundGeo = new THREE.PlaneGeometry(600, 600);
    const ground = new THREE.Mesh(groundGeo, matAsphalt);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.05, -60);
    ground.receiveShadow = true;
    scene.add(ground);

    // 2. Tower Upper Mass
    const towerMassGeo = new THREE.BoxGeometry(92, 1200, 80);
    const towerMass = new THREE.Mesh(towerMassGeo, matConcrete);
    towerMass.position.set(-30, 759, -330);
    scene.add(towerMass);

    // 3. Stack Megastructure (14 levels, 26m half extent, 11m level height)
    const stackGroup = new THREE.Group();
    scene.add(stackGroup);

    const STACK_HALF = 26.0;
    const STACK_HEIGHT = 11.0;
    const STACK_LEVELS = 14;
    const STACK_CZ = -150.0;

    for (let lvl = 1; lvl <= STACK_LEVELS; lvl++) {
      const y = lvl * STACK_HEIGHT;
      // Deck frame rings
      const deckMat = lvl % 2 === 1 ? matGalvanised : matMillScale;
      // North & South bands
      const bandNSGeo = new THREE.BoxGeometry(STACK_HALF * 2, 0.5, 9.0);
      const bandN = new THREE.Mesh(bandNSGeo, deckMat);
      bandN.position.set(0, y - 0.25, STACK_CZ - (STACK_HALF - 4.5));
      const bandS = new THREE.Mesh(bandNSGeo, deckMat);
      bandS.position.set(0, y - 0.25, STACK_CZ + (STACK_HALF - 4.5));
      stackGroup.add(bandN, bandS);

      // East & West bands
      const bandEWGeo = new THREE.BoxGeometry(9.0, 0.5, (STACK_HALF - 9.0) * 2);
      const bandE = new THREE.Mesh(bandEWGeo, deckMat);
      bandE.position.set(STACK_HALF - 4.5, y - 0.25, STACK_CZ);
      const bandW = new THREE.Mesh(bandEWGeo, deckMat);
      bandW.position.set(-(STACK_HALF - 4.5), y - 0.25, STACK_CZ);
      stackGroup.add(bandE, bandW);

      // Rails
      const railGeo = new THREE.BoxGeometry(STACK_HALF * 2, 0.08, 0.08);
      const rail = new THREE.Mesh(railGeo, matGalvanised);
      rail.position.set(0, y + 1.05, STACK_CZ + STACK_HALF);
      stackGroup.add(rail);
    }

    // Stack Columns & Diagonal Braces
    for (let lvl = 0; lvl < STACK_LEVELS; lvl++) {
      const y = lvl * STACK_HEIGHT + STACK_HEIGHT / 2;
      const colGeo = new THREE.BoxGeometry(1.6, STACK_HEIGHT, 1.6);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const col = new THREE.Mesh(colGeo, matRustDeep);
          col.position.set(sx * STACK_HALF, y, STACK_CZ + sz * STACK_HALF);
          stackGroup.add(col);
        }
      }
      // Diagonal cross brace on front face
      const braceGeo = new THREE.BoxGeometry(STACK_HALF * 1.4, 0.4, 0.4);
      const brace1 = new THREE.Mesh(braceGeo, matOxidised);
      brace1.position.set(0, y, STACK_CZ + STACK_HALF);
      brace1.rotation.z = 0.4;
      const brace2 = new THREE.Mesh(braceGeo, matOxidised);
      brace2.position.set(0, y, STACK_CZ + STACK_HALF);
      brace2.rotation.z = -0.4;
      stackGroup.add(brace1, brace2);
    }

    // Machine Halls on Stack
    const hallGeo1 = new THREE.BoxGeometry(11, 22, 13);
    const hall1 = new THREE.Mesh(hallGeo1, matTimber);
    hall1.position.set(-(STACK_HALF + 4), 3 * STACK_HEIGHT + 10, STACK_CZ);
    stackGroup.add(hall1);

    const hallWindowGeo = new THREE.BoxGeometry(0.3, 2.0, 1.6);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 2; c++) {
        const win = new THREE.Mesh(hallWindowGeo, matWindowLit);
        win.position.set(-(STACK_HALF + 9.6), 3 * STACK_HEIGHT + 4 + r * 4.5, STACK_CZ - 3 + c * 6);
        stackGroup.add(win);
      }
    }

    // Decorative Gearwheels on Front Face
    const gears: THREE.Mesh[] = [];
    const gearGeo1 = new THREE.CylinderGeometry(6.4, 6.4, 0.8, 24);
    const gear1 = new THREE.Mesh(gearGeo1, matOxidised);
    gear1.position.set(-8, 2.4 * STACK_HEIGHT, STACK_CZ + STACK_HALF + 1.2);
    gear1.rotation.x = Math.PI / 2;
    stackGroup.add(gear1);
    gears.push(gear1);

    const gearGeo2 = new THREE.CylinderGeometry(4.2, 4.2, 0.8, 20);
    const gear2 = new THREE.Mesh(gearGeo2, matRustDeep);
    gear2.position.set(3, 3.6 * STACK_HEIGHT, STACK_CZ + STACK_HALF + 1.0);
    gear2.rotation.x = Math.PI / 2;
    stackGroup.add(gear2);
    gears.push(gear2);

    // 4. Moving Supports in Yard
    // Translating support
    const transMesh = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.5, 4.0), matGalvanised);
    transMesh.position.set(-8.0, 0.25, -20.0);
    scene.add(transMesh);

    // Rotating support
    const rotMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.5, 24), matFadedYellow);
    rotMesh.position.set(8.0, 0.25, -20.0);
    scene.add(rotMesh);

    // Vault Rail
    const railMesh = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.85, 0.2), matHazard);
    railMesh.position.set(0, 0.425, -10.0);
    scene.add(railMesh);

    // Mantle Ledge
    const mantleMesh = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.45, 1.2), matConcrete);
    mantleMesh.position.set(5.0, 0.725, -14.0);
    scene.add(mantleMesh);

    // 5. Coupled Machine: Plant & Yard
    // Hoist Mast & Scoop
    const hoistMast = new THREE.Mesh(new THREE.BoxGeometry(1.2, 14.0, 1.2), matRustDeep);
    hoistMast.position.set(34.0, 7.0, -96.0);
    scene.add(hoistMast);

    const scoopMesh = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 2.2), matHazard);
    scene.add(scoopMesh);

    // Ballast Weight
    const ballastMesh = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), matMillScale);
    scene.add(ballastMesh);

    // Tipper (hinged at x=29, y=3.6, z=-96)
    const tipperGroup = new THREE.Group();
    tipperGroup.position.set(29.0, 3.6, -96.0);
    const tipperBody = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.4, 2.8), matRustDeep);
    tipperBody.position.set(-1.0, 0, 0);
    tipperGroup.add(tipperBody);
    scene.add(tipperGroup);

    // Valve Lever (hinged at x=29.6, y=7.2, z=-96)
    const valveGroup = new THREE.Group();
    valveGroup.position.set(29.6, 7.2, -96.0);
    const valveLever = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 0.2), matHazard);
    valveLever.position.set(-0.8, 0, 0);
    valveGroup.add(valveLever);
    scene.add(valveGroup);

    // Pressure Vessel Shell
    const vesselMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 6.0, 24), matOxidised);
    vesselMesh.position.set(26.0, 3.0, -90.0);
    scene.add(vesselMesh);

    // Firebox Light
    const fireLight = new THREE.PointLight(0xff5511, 2.0, 22);
    fireLight.position.set(26.0, 1.2, -90.0);
    scene.add(fireLight);

    // Vent Plume Light
    const ventLight = new THREE.PointLight(0xffeedd, 1.5, 30);
    ventLight.position.set(26.0, 6.5, -90.0);
    scene.add(ventLight);

    // Lift Mast, Platform, Counterweight
    const liftMast = new THREE.Mesh(new THREE.BoxGeometry(1.4, 12.0, 1.4), matRustDeep);
    liftMast.position.set(13.0, 6.0, -100.0);
    scene.add(liftMast);

    const liftPlatform = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.4, 3.6), matGalvanised);
    scene.add(liftPlatform);

    const counterweight = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 1.6), matMillScale);
    scene.add(counterweight);

    // Catwalk (y=8.69, z=-102 to -115)
    const catwalk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, 13.0), matGalvanised);
    catwalk.position.set(16.4, 8.69, -108.5);
    scene.add(catwalk);

    // Catwalk Treadle
    const treadleGroup = new THREE.Group();
    treadleGroup.position.set(16.4, 9.09, -106.0);
    const treadlePlate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.2), matHazard);
    treadlePlate.position.set(-0.75, 0, 0);
    treadleGroup.add(treadlePlate);
    scene.add(treadleGroup);

    // 6. KX-JIB Crane (at x=200, z=0)
    const jibMast = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 5.0, 16), matRustDeep);
    jibMast.position.set(200.0, 2.5, 0.0);
    scene.add(jibMast);

    const jibBoomGroup = new THREE.Group();
    jibBoomGroup.position.set(200.0, 5.0, 0.0);
    const jibBoomArm = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.4, 0.4), matFadedYellow);
    jibBoomArm.position.set(3.0, 0, 0);
    jibBoomGroup.add(jibBoomArm);
    scene.add(jibBoomGroup);

    const jibHook = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 12), matHazard);
    scene.add(jibHook);

    const jibCrate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), matTimber);
    scene.add(jibCrate);

    // Jib Station Ring
    const jibStationRing = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 2.5, 32),
      new THREE.MeshBasicMaterial({ color: 0xe8d9a8, side: THREE.DoubleSide })
    );
    jibStationRing.rotation.x = -Math.PI / 2;
    jibStationRing.position.set(197.5, 0.02, -2.0);
    scene.add(jibStationRing);

    // 7. KX-NEEDLE Piers & Seatable Beam
    const pierGeo = new THREE.BoxGeometry(5.0, 4.0, 3.2);
    const pierApproach = new THREE.Mesh(pierGeo, matConcrete);
    pierApproach.position.set(200.0, 2.0, -13.0);
    const pierFar = new THREE.Mesh(pierGeo, matConcrete);
    pierFar.position.set(200.0, 2.0, -19.0);
    scene.add(pierApproach, pierFar);

    const needleBeam = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 4.2), matRustDeep);
    scene.add(needleBeam);

    // 8. KX-SUMP Sump Basin & Grate
    const sumpBasin = new THREE.Mesh(new THREE.BoxGeometry(5.0, 2.5, 5.0), matConcrete);
    sumpBasin.position.set(200.0, -1.25, 16.0);
    scene.add(sumpBasin);

    const sumpGrate = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.1, 4.8), matHazardGrate);
    sumpGrate.position.set(200.0, 0.05, 16.0);
    scene.add(sumpGrate);

    // Sump Valve Wheel
    const sumpValve = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 12, 24), matHazard);
    sumpValve.position.set(200.0, 1.2, 14.0);
    sumpValve.rotation.y = Math.PI / 2;
    scene.add(sumpValve);

    // 9. Alpine Mountain Backdrop
    const mountainGroup = new THREE.Group();
    const mountainMat = new THREE.MeshStandardMaterial({ color: 0x2e3235, roughness: 0.95 });
    for (let m = 0; m < 9; m++) {
      const coneGeo = new THREE.ConeGeometry(120 + m * 20, 350 + m * 40, 6);
      const mountain = new THREE.Mesh(coneGeo, mountainMat);
      const angle = (m / 9) * Math.PI * 1.5 + 0.5;
      const dist = 750 + (m % 3) * 150;
      mountain.position.set(Math.cos(angle) * dist, 120, -Math.sin(angle) * dist);
      mountainGroup.add(mountain);
    }
    scene.add(mountainGroup);

    // 10. Steam Plume Particle System
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    for (let p = 0; p < particleCount; p++) {
      particlePositions[p * 3] = 26.0 + (Math.random() - 0.5) * 0.8;
      particlePositions[p * 3 + 1] = 6.0 + Math.random() * 8.0;
      particlePositions[p * 3 + 2] = -90.0 + (Math.random() - 0.5) * 0.8;
      particleSizes[p] = 1.0 + Math.random() * 2.0;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xded8cc,
      size: 2.5,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    const plumeParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(plumeParticles);

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation & Physics Loop
    let lastTime = performance.now();
    let animId = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min(0.08, (now - lastTime) / 1000);
      lastTime = now;

      // Apply look delta from mouse or touch
      yawRef.current -= lookDeltaRef.current.x * 0.003;
      pitchRef.current = Math.max(-1.25, Math.min(1.35, pitchRef.current - lookDeltaRef.current.y * 0.003));
      lookDeltaRef.current.x = 0;
      lookDeltaRef.current.y = 0;

      // Update engine facing from camera yaw
      const facingX = -Math.sin(yawRef.current);
      const facingZ = -Math.cos(yawRef.current);
      engine.setFacing(facingX, facingZ);

      // Advance physics simulation
      engine.advanceFrame(dt);
      const snap = engine.getSnapshot();
      onSnapshot(snap);

      // Update Camera (First person eye offset at y = +0.62)
      camera.position.set(
        snap.player_position.x,
        snap.player_position.y + 0.62,
        snap.player_position.z
      );
      camera.rotation.order = 'YXZ';
      camera.rotation.y = yawRef.current;
      camera.rotation.x = pitchRef.current;
      camera.rotation.z = 0;

      // Update Mesh Transforms from snapshot
      transMesh.position.set(
        snap.translating_support_position.x,
        snap.translating_support_position.y,
        snap.translating_support_position.z
      );

      rotMesh.position.set(
        snap.rotating_support_position.x,
        snap.rotating_support_position.y,
        snap.rotating_support_position.z
      );
      rotMesh.rotation.y = snap.rotating_support_yaw_radians;

      // Machine meshes
      scoopMesh.position.set(
        snap.hoist_scoop_position.x,
        snap.hoist_scoop_position.y,
        snap.hoist_scoop_position.z
      );
      scoopMesh.rotation.z = snap.hoist_scoop_tilt_radians;

      ballastMesh.position.set(
        snap.ballast_position.x,
        snap.ballast_position.y,
        snap.ballast_position.z
      );

      tipperGroup.rotation.z = snap.tipper_angle_radians;
      valveGroup.rotation.z = snap.valve_lever_angle_radians;
      treadleGroup.rotation.z = snap.treadle_angle_radians;

      liftPlatform.position.set(
        snap.lift_platform_position.x,
        snap.lift_platform_position.y,
        snap.lift_platform_position.z
      );
      counterweight.position.set(
        snap.counterweight_position.x,
        snap.counterweight_position.y,
        snap.counterweight_position.z
      );

      // Crane meshes
      jibBoomGroup.rotation.y = snap.jib_boom_angle_radians;
      jibHook.position.set(snap.jib_hook_position.x, snap.jib_hook_position.y, snap.jib_hook_position.z);
      jibCrate.position.set(snap.jib_crate_position.x, snap.jib_crate_position.y, snap.jib_crate_position.z);

      // Needle mesh
      needleBeam.position.set(snap.needle_position.x, snap.needle_position.y, snap.needle_position.z);

      // Sump grate material
      sumpGrate.material = snap.grate_safe ? matSafeGrate : matHazardGrate;

      // Gear rotation with machine phase
      const gearAngle = (snap.machine_cycle_phase_seconds / 26.0) * Math.PI * 2;
      gear1.rotation.y = gearAngle;
      gear2.rotation.y = -gearAngle * 1.5;

      // Plume particles
      const flow = snap.orifice_mass_flow_kg_per_s;
      ventLight.intensity = 0.5 + Math.min(10.0, flow * 12.0);
      particleMat.opacity = Math.min(0.7, flow * 1.5);
      const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;
      for (let p = 0; p < particleCount; p++) {
        positions[p * 3 + 1] += (2.0 + flow * 8.0) * dt;
        if (positions[p * 3 + 1] > 20.0) {
          positions[p * 3 + 1] = 6.0;
          positions[p * 3] = 26.0 + (Math.random() - 0.5) * 0.8;
          positions[p * 3 + 2] = -90.0 + (Math.random() - 0.5) * 0.8;
        }
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [engine, onSnapshot, lookDeltaRef]);

  return <div ref={containerRef} className="w-full h-full relative cursor-crosshair touch-none" id="viewport-canvas" />;
};
