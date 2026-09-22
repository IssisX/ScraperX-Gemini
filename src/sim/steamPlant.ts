export interface SteamPlantConfig {
  vesselVolumeM3: number;
  cylinderVolumeM3: number;
  temperatureK: number;
  gasConstantJPerKgK: number;
  heatCapacityRatio: number;
  ambientPressurePa: number;
  orificeAreaM2: number;
  orificeDischargeCoefficient: number;
  cylinderBleedAreaM2: number;
  cylinderBleedDischargeCoefficient: number;
  pistonAreaM2: number;
  regulatedPressurePa: number;
  maximumFeedKgPerS: number;
  initialVesselPressurePa: number;
}

export const defaultSteamPlantConfig: SteamPlantConfig = {
  vesselVolumeM3: 6.0,
  cylinderVolumeM3: 0.32,
  temperatureK: 450.0,
  gasConstantJPerKgK: 461.5,
  heatCapacityRatio: 1.30,
  ambientPressurePa: 101325.0,
  orificeAreaM2: 0.0120,
  orificeDischargeCoefficient: 0.72,
  cylinderBleedAreaM2: 0.00185,
  cylinderBleedDischargeCoefficient: 0.68,
  pistonAreaM2: 0.045,
  regulatedPressurePa: 4.60e5,
  maximumFeedKgPerS: 0.145,
  initialVesselPressurePa: 4.60e5,
};

export class SteamPlant {
  private config: SteamPlantConfig;
  private feedEnabled = true;

  public vesselPressurePa = 0.0;
  public cylinderPressurePa = 0.0;
  public vesselMassKg = 0.0;
  public cylinderMassKg = 0.0;
  public valveOpenFraction = 0.0;
  public orificeMassFlowKgPerS = 0.0;
  public bleedMassFlowKgPerS = 0.0;
  public feedMassFlowKgPerS = 0.0;
  public pistonForceN = 0.0;
  public ventedMassKg = 0.0;
  public fedMassKg = 0.0;

  constructor(config: Partial<SteamPlantConfig> = {}) {
    this.config = { ...defaultSteamPlantConfig, ...config };
    const rt = this.config.gasConstantJPerKgK * this.config.temperatureK;
    this.vesselMassKg = (this.config.initialVesselPressurePa * this.config.vesselVolumeM3) / rt;
    this.cylinderMassKg = (this.config.ambientPressurePa * this.config.cylinderVolumeM3) / rt;
    this.vesselPressurePa = this.config.initialVesselPressurePa;
    this.cylinderPressurePa = this.config.ambientPressurePa;
  }

  public setValveOpenFraction(fraction: number): void {
    if (!Number.isFinite(fraction)) {
      this.valveOpenFraction = 0.0;
      return;
    }
    this.valveOpenFraction = Math.max(0.0, Math.min(1.0, fraction));
  }

  public setFeedEnabled(enabled: boolean): void {
    this.feedEnabled = enabled;
  }

  public restoreState(vesselMass: number, cylinderMass: number): void {
    this.vesselMassKg = Math.max(0.0, vesselMass);
    this.cylinderMassKg = Math.max(0.0, cylinderMass);
    const rt = this.config.gasConstantJPerKgK * this.config.temperatureK;
    this.vesselPressurePa = (this.vesselMassKg * rt) / this.config.vesselVolumeM3;
    this.cylinderPressurePa = (this.cylinderMassKg * rt) / this.config.cylinderVolumeM3;
    this.orificeMassFlowKgPerS = 0.0;
    this.bleedMassFlowKgPerS = 0.0;
    this.feedMassFlowKgPerS = 0.0;
    this.pistonForceN = 0.0;
  }

  public massFlowKgPerS(
    upstreamPressurePa: number,
    downstreamPressurePa: number,
    areaM2: number,
    dischargeCoefficient: number
  ): number {
    if (!(areaM2 > 0.0) || !(upstreamPressurePa > downstreamPressurePa)) {
      return 0.0;
    }

    const gamma = this.config.heatCapacityRatio;
    const rt = this.config.gasConstantJPerKgK * this.config.temperatureK;
    if (!(rt > 0.0) || !(gamma > 1.0)) {
      return 0.0;
    }

    const criticalRatio = Math.pow(2.0 / (gamma + 1.0), gamma / (gamma - 1.0));
    const ratio = downstreamPressurePa / upstreamPressurePa;

    let flowFunction = 0.0;
    if (ratio <= criticalRatio) {
      flowFunction = Math.sqrt(
        (gamma / rt) * Math.pow(2.0 / (gamma + 1.0), (gamma + 1.0) / (gamma - 1.0))
      );
    } else {
      const term = Math.pow(ratio, 2.0 / gamma) - Math.pow(ratio, (gamma + 1.0) / gamma);
      if (!(term > 0.0)) {
        return 0.0;
      }
      flowFunction = Math.sqrt(((2.0 * gamma) / ((gamma - 1.0) * rt)) * term);
    }

    const flow = dischargeCoefficient * areaM2 * upstreamPressurePa * flowFunction;
    return Number.isFinite(flow) && flow > 0.0 ? flow : 0.0;
  }

  public vesselAvailableEnergyJ(): number {
    const rt = this.config.gasConstantJPerKgK * this.config.temperatureK;
    const ambientMass = (this.config.ambientPressurePa * this.config.vesselVolumeM3) / rt;
    const usableMass = Math.max(0.0, this.vesselMassKg - ambientMass);
    const specificInternalEnergy =
      (this.config.gasConstantJPerKgK * this.config.temperatureK) /
      (this.config.heatCapacityRatio - 1.0);
    return usableMass * specificInternalEnergy;
  }

  public step(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0.0) {
      return;
    }

    const rt = this.config.gasConstantJPerKgK * this.config.temperatureK;

    const orificeArea = this.config.orificeAreaM2 * this.valveOpenFraction;
    const orificeFlow = this.massFlowKgPerS(
      this.vesselPressurePa,
      this.cylinderPressurePa,
      orificeArea,
      this.config.orificeDischargeCoefficient
    );
    const bleedFlow = this.massFlowKgPerS(
      this.cylinderPressurePa,
      this.config.ambientPressurePa,
      this.config.cylinderBleedAreaM2,
      this.config.cylinderBleedDischargeCoefficient
    );

    let feedFlow = 0.0;
    if (this.feedEnabled && this.vesselPressurePa < this.config.regulatedPressurePa) {
      const deficit = this.config.regulatedPressurePa - this.vesselPressurePa;
      const proportional = (deficit / this.config.regulatedPressurePa) * 4.0;
      feedFlow = Math.min(
        this.config.maximumFeedKgPerS,
        this.config.maximumFeedKgPerS * proportional
      );
    }

    const vesselFloor = (this.config.ambientPressurePa * this.config.vesselVolumeM3) / rt;
    const cylinderFloor = (this.config.ambientPressurePa * this.config.cylinderVolumeM3) / rt;

    let orificeMass = orificeFlow * deltaSeconds;
    orificeMass = Math.min(orificeMass, Math.max(0.0, this.vesselMassKg - vesselFloor));

    let bleedMass = bleedFlow * deltaSeconds;
    bleedMass = Math.min(bleedMass, Math.max(0.0, this.cylinderMassKg - cylinderFloor));

    const feedMass = feedFlow * deltaSeconds;

    this.vesselMassKg = Math.max(0.0, this.vesselMassKg - orificeMass + feedMass);
    this.cylinderMassKg = Math.max(0.0, this.cylinderMassKg + orificeMass - bleedMass);

    this.vesselPressurePa = (this.vesselMassKg * rt) / this.config.vesselVolumeM3;
    this.cylinderPressurePa = (this.cylinderMassKg * rt) / this.config.cylinderVolumeM3;

    this.orificeMassFlowKgPerS = orificeMass / deltaSeconds;
    this.bleedMassFlowKgPerS = bleedMass / deltaSeconds;
    this.feedMassFlowKgPerS = feedMass / deltaSeconds;
    this.ventedMassKg += orificeMass;
    this.fedMassKg += feedMass;

    const gauge = this.cylinderPressurePa - this.config.ambientPressurePa;
    this.pistonForceN = Math.max(0.0, gauge) * this.config.pistonAreaM2;
  }
}
