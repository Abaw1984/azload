import {
  StructuralModel,
  LoadCalculationResult,
  WindLoadParameters,
  SeismicLoadParameters,
  SnowLoadParameters,
  Load,
  LoadType,
  Node,
  Member,
} from "@/types/model";

// ASCE 7-16 Load Calculation Engine
export class LoadCalculationEngine {
  static calculateWindLoads(
    model: StructuralModel,
    parameters: WindLoadParameters,
  ): LoadCalculationResult {
    const loads: Load[] = [];
    const warnings: string[] = [];
    const codeReferences: string[] = [
      "ASCE 7-16 Chapter 27 - Wind Loads on Buildings - MWFRS",
      "ASCE 7-16 Chapter 30 - Wind Loads on Buildings - C&C",
    ];

    // Validate parameters
    if (parameters.basicWindSpeed < 85 || parameters.basicWindSpeed > 200) {
      warnings.push("Basic wind speed outside typical range (85-200 mph)");
    }

    // Calculate design wind pressure (ASCE 7-16 Eq. 27.3-1)
    const qz = this.calculateVelocityPressure(parameters);
    const G = parameters.gustFactor;
    const Cp = this.calculatePressureCoefficients(model, parameters);
    const GCpi = parameters.internalPressureCoefficient;

    // Apply wind loads to building surfaces
    const windwardPressure = qz * G * Cp.windward - qz * GCpi;
    const leewardPressure = qz * G * Cp.leeward - qz * GCpi;
    const sidewallPressure = qz * G * Cp.sidewall - qz * GCpi;
    const roofPressure = qz * G * Cp.roof - qz * GCpi;

    // Generate loads for structural members
    model.members.forEach((member, index) => {
      const memberLoads = this.generateWindLoadsForMember(
        member,
        model,
        parameters,
        { windwardPressure, leewardPressure, sidewallPressure, roofPressure },
      );
      loads.push(...memberLoads);
    });

    const summary = this.calculateLoadSummary(loads);

    return {
      loadType: "WIND",
      parameters,
      loads,
      summary,
      codeReferences,
      warnings,
    };
  }

  static calculateSeismicLoads(
    model: StructuralModel,
    parameters: SeismicLoadParameters,
  ): LoadCalculationResult {
    const loads: Load[] = [];
    const warnings: string[] = [];
    const codeReferences: string[] = [
      "ASCE 7-16 Chapter 12 - Seismic Design Requirements",
      "ASCE 7-16 Section 12.8 - Equivalent Lateral Force Procedure",
    ];

    // Calculate design response spectrum parameters (ASCE 7-16 Section 11.4)
    const Sds = (2 / 3) * parameters.fa * parameters.ss;
    const Sd1 = (2 / 3) * parameters.fv * parameters.s1;

    if (Sds < 0.167) {
      warnings.push("Low seismic design category - minimal seismic loads");
    }

    // Calculate seismic response coefficient (ASCE 7-16 Eq. 12.8-2)
    const Cs = Math.min(
      Sds /
        (parameters.responseModificationFactor / parameters.importanceFactor),
      Sd1 /
        ((parameters.responseModificationFactor / parameters.importanceFactor) *
          1.0), // T = 1.0 assumed
    );

    // Calculate base shear (ASCE 7-16 Eq. 12.8-1)
    const V = Cs * parameters.seismicWeight;

    // Distribute seismic forces to structural levels
    const buildingHeight = model.geometry?.totalHeight || 10;
    const seismicForcePerLevel =
      V / Math.max(1, Math.floor(buildingHeight / 3));

    // Apply seismic loads to columns and shear walls
    model.members
      .filter((m) => m.type === "COLUMN" || m.tag?.includes("COLUMN"))
      .forEach((member, index) => {
        const startNode = model.nodes.find((n) => n.id === member.startNodeId);
        const endNode = model.nodes.find((n) => n.id === member.endNodeId);

        if (startNode && endNode) {
          const memberHeight = Math.abs(endNode.z - startNode.z);
          const forceRatio = memberHeight / buildingHeight;

          // X-direction seismic force
          loads.push({
            id: `SEISMIC_X_${member.id}`,
            type: "NODAL",
            targetId: endNode.id,
            direction: "X",
            magnitude: seismicForcePerLevel * forceRatio,
          });

          // Y-direction seismic force
          loads.push({
            id: `SEISMIC_Y_${member.id}`,
            type: "NODAL",
            targetId: endNode.id,
            direction: "Y",
            magnitude: seismicForcePerLevel * forceRatio,
          });
        }
      });

    const summary = this.calculateLoadSummary(loads);

    return {
      loadType: "SEISMIC",
      parameters,
      loads,
      summary,
      codeReferences,
      warnings,
    };
  }

  static calculateSnowLoads(
    model: StructuralModel,
    parameters: SnowLoadParameters,
  ): LoadCalculationResult {
    const loads: Load[] = [];
    const warnings: string[] = [];
    const codeReferences: string[] = [
      "ASCE 7-16 Chapter 7 - Snow Loads",
      "ASCE 7-16 Section 7.3 - Flat Roof Snow Loads",
      "ASCE 7-16 Section 7.4 - Sloped Roof Snow Loads",
    ];

    if (parameters.groundSnowLoad < 0) {
      warnings.push("Ground snow load cannot be negative");
      return {
        loadType: "SNOW",
        parameters,
        loads: [],
        summary: {
          totalForce: { x: 0, y: 0, z: 0 },
          totalMoment: { x: 0, y: 0, z: 0 },
          maxPressure: 0,
          minPressure: 0,
        },
        codeReferences,
        warnings,
      };
    }

    // Calculate flat roof snow load (ASCE 7-16 Eq. 7.3-1)
    const pf =
      0.7 *
      parameters.exposureFactor *
      parameters.thermalFactor *
      parameters.importanceFactor *
      parameters.groundSnowLoad;

    // Calculate sloped roof snow load (ASCE 7-16 Section 7.4)
    const roofSlope = parameters.roofSlope;
    let Cs = 1.0; // Snow load coefficient

    if (roofSlope <= 30) {
      Cs = 1.0;
    } else if (roofSlope <= 70) {
      Cs = (70 - roofSlope) / 40;
    } else {
      Cs = 0;
      warnings.push("Steep roof slope - snow loads may not govern");
    }

    const ps = Cs * pf;

    // Apply snow loads to roof members
    model.members
      .filter(
        (m) =>
          m.type === "RAFTER" ||
          m.type === "PURLIN" ||
          m.tag?.includes("RAFTER") ||
          m.tag?.includes("PURLIN"),
      )
      .forEach((member) => {
        const startNode = model.nodes.find((n) => n.id === member.startNodeId);
        const endNode = model.nodes.find((n) => n.id === member.endNodeId);

        if (startNode && endNode) {
          const memberLength = Math.sqrt(
            Math.pow(endNode.x - startNode.x, 2) +
              Math.pow(endNode.y - startNode.y, 2) +
              Math.pow(endNode.z - startNode.z, 2),
          );

          // Assume tributary width based on building geometry
          const tributaryWidth = model.geometry
            ? model.geometry.buildingWidth / 10
            : 3.0;
          const totalSnowLoad = ps * memberLength * tributaryWidth;

          loads.push({
            id: `SNOW_${member.id}`,
            type: "MEMBER",
            targetId: member.id,
            direction: "Z",
            magnitude: -totalSnowLoad, // Downward
            distribution: "UNIFORM",
          });
        }
      });

    const summary = this.calculateLoadSummary(loads);

    return {
      loadType: "SNOW",
      parameters,
      loads,
      summary,
      codeReferences,
      warnings,
    };
  }

  static calculateLiveLoads(
    model: StructuralModel,
    parameters: { occupancyCategory: string; liveLoadPsf: number },
  ): LoadCalculationResult {
    const loads: Load[] = [];
    const warnings: string[] = [];
    const codeReferences: string[] = [
      "ASCE 7-16 Chapter 4 - Live Loads",
      "ASCE 7-16 Table 4.3-1 - Minimum Uniformly Distributed Live Loads",
    ];

    const liveLoadPressure = parameters.liveLoadPsf * 47.88; // Convert psf to N/m²

    // Apply live loads to floor beams and slabs
    model.members
      .filter(
        (m) =>
          m.type === "BEAM" ||
          m.tag?.includes("BEAM") ||
          m.tag?.includes("MEZZANINE"),
      )
      .forEach((member) => {
        const startNode = model.nodes.find((n) => n.id === member.startNodeId);
        const endNode = model.nodes.find((n) => n.id === member.endNodeId);

        if (startNode && endNode) {
          const memberLength = Math.sqrt(
            Math.pow(endNode.x - startNode.x, 2) +
              Math.pow(endNode.y - startNode.y, 2) +
              Math.pow(endNode.z - startNode.z, 2),
          );

          // Assume tributary width
          const tributaryWidth = 3.0; // meters
          const totalLiveLoad =
            liveLoadPressure * memberLength * tributaryWidth;

          loads.push({
            id: `LIVE_${member.id}`,
            type: "MEMBER",
            targetId: member.id,
            direction: "Z",
            magnitude: -totalLiveLoad, // Downward
            distribution: "UNIFORM",
          });
        }
      });

    const summary = this.calculateLoadSummary(loads);

    return {
      loadType: "LIVE",
      parameters,
      loads,
      summary,
      codeReferences,
      warnings,
    };
  }

  static calculateDeadLoads(
    model: StructuralModel,
    parameters: {
      materialDensities: { [key: string]: number };
      additionalDeadLoad: number;
    },
  ): LoadCalculationResult {
    const loads: Load[] = [];
    const warnings: string[] = [];
    const codeReferences: string[] = [
      "ASCE 7-16 Chapter 3 - Dead Loads",
      "ASCE 7-16 Section 3.1 - Definition",
    ];

    // Calculate self-weight of structural members
    model.members.forEach((member) => {
      const material = model.materials.find((m) => m.id === member.materialId);
      const section = model.sections.find((s) => s.id === member.sectionId);
      const startNode = model.nodes.find((n) => n.id === member.startNodeId);
      const endNode = model.nodes.find((n) => n.id === member.endNodeId);

      if (material && section && startNode && endNode) {
        const memberLength = Math.sqrt(
          Math.pow(endNode.x - startNode.x, 2) +
            Math.pow(endNode.y - startNode.y, 2) +
            Math.pow(endNode.z - startNode.z, 2),
        );

        const selfWeight =
          material.properties.density *
          section.properties.area *
          memberLength *
          9.81; // N

        loads.push({
          id: `DEAD_SELF_${member.id}`,
          type: "MEMBER",
          targetId: member.id,
          direction: "Z",
          magnitude: -selfWeight, // Downward
          distribution: "UNIFORM",
        });
      }
    });

    // Add additional dead loads (cladding, equipment, etc.)
    if (parameters.additionalDeadLoad > 0) {
      model.members
        .filter(
          (m) =>
            m.type === "RAFTER" ||
            m.type === "PURLIN" ||
            m.tag?.includes("RAFTER") ||
            m.tag?.includes("PURLIN"),
        )
        .forEach((member) => {
          const startNode = model.nodes.find(
            (n) => n.id === member.startNodeId,
          );
          const endNode = model.nodes.find((n) => n.id === member.endNodeId);

          if (startNode && endNode) {
            const memberLength = Math.sqrt(
              Math.pow(endNode.x - startNode.x, 2) +
                Math.pow(endNode.y - startNode.y, 2) +
                Math.pow(endNode.z - startNode.z, 2),
            );

            const tributaryWidth = 3.0; // meters
            const additionalLoad =
              parameters.additionalDeadLoad * memberLength * tributaryWidth;

            loads.push({
              id: `DEAD_ADDITIONAL_${member.id}`,
              type: "MEMBER",
              targetId: member.id,
              direction: "Z",
              magnitude: -additionalLoad, // Downward
              distribution: "UNIFORM",
            });
          }
        });
    }

    const summary = this.calculateLoadSummary(loads);

    return {
      loadType: "DEAD",
      parameters,
      loads,
      summary,
      codeReferences,
      warnings,
    };
  }

  static calculateCraneLoads(
    model: StructuralModel,
    parameters: {
      craneCapacity: number;
      craneWeight: number;
      wheelLoads: number[];
      impactFactor: number;
    },
  ): LoadCalculationResult {
    const loads: Load[] = [];
    const warnings: string[] = [];
    const codeReferences: string[] = [
      "ASCE 7-16 Section 4.9 - Crane Loads",
      "AISC Design Guide 7 - Industrial Buildings",
    ];

    // Find crane beams
    const craneBeams = model.members.filter(
      (m) => m.type === "CRANE_RAIL" || m.tag === "CRANE_BEAM",
    );

    if (craneBeams.length === 0) {
      warnings.push("No crane beams identified in the model");
      return {
        loadType: "CRANE",
        parameters,
        loads: [],
        summary: {
          totalForce: { x: 0, y: 0, z: 0 },
          totalMoment: { x: 0, y: 0, z: 0 },
          maxPressure: 0,
          minPressure: 0,
        },
        codeReferences,
        warnings,
      };
    }

    // Calculate crane loads with impact
    const verticalWheelLoad =
      (parameters.craneCapacity + parameters.craneWeight) /
      parameters.wheelLoads.length;
    const impactLoad = verticalWheelLoad * parameters.impactFactor;
    const totalVerticalLoad = verticalWheelLoad + impactLoad;

    // Horizontal loads (lateral and longitudinal)
    const lateralLoad = Math.max(0.2 * verticalWheelLoad, 2000); // N, minimum 2kN
    const longitudinalLoad =
      0.1 * (parameters.craneCapacity + parameters.craneWeight);

    craneBeams.forEach((beam, index) => {
      const startNode = model.nodes.find((n) => n.id === beam.startNodeId);
      const endNode = model.nodes.find((n) => n.id === beam.endNodeId);

      if (startNode && endNode) {
        // Vertical loads at wheel positions
        loads.push({
          id: `CRANE_VERTICAL_${beam.id}_START`,
          type: "NODAL",
          targetId: startNode.id,
          direction: "Z",
          magnitude: -totalVerticalLoad,
        });

        loads.push({
          id: `CRANE_VERTICAL_${beam.id}_END`,
          type: "NODAL",
          targetId: endNode.id,
          direction: "Z",
          magnitude: -totalVerticalLoad,
        });

        // Lateral loads
        loads.push({
          id: `CRANE_LATERAL_${beam.id}`,
          type: "NODAL",
          targetId: startNode.id,
          direction: "Y",
          magnitude: lateralLoad,
        });

        // Longitudinal loads
        loads.push({
          id: `CRANE_LONGITUDINAL_${beam.id}`,
          type: "NODAL",
          targetId: startNode.id,
          direction: "X",
          magnitude: longitudinalLoad,
        });
      }
    });

    const summary = this.calculateLoadSummary(loads);

    return {
      loadType: "CRANE",
      parameters,
      loads,
      summary,
      codeReferences,
      warnings,
    };
  }

  // Helper methods
  private static calculateVelocityPressure(
    parameters: WindLoadParameters,
  ): number {
    // ASCE 7-16 Eq. 26.6-1: qz = 0.00256 * Kz * Kzt * Kd * V²
    const Kz = this.calculateExposureCoefficient(
      parameters.exposureCategory,
      parameters.buildingHeight,
    );
    const Kzt = parameters.topographicFactor;
    const Kd = parameters.directionality;
    const V = parameters.basicWindSpeed;

    return 0.00256 * Kz * Kzt * Kd * Math.pow(V, 2) * 47.88; // Convert to N/m²
  }

  private static calculateExposureCoefficient(
    category: string,
    height: number,
  ): number {
    // ASCE 7-16 Table 26.10-1
    switch (category) {
      case "B":
        return Math.max(0.7, 2.01 * Math.pow(height / 9.14, 2 / 7));
      case "C":
        return Math.max(0.85, 2.01 * Math.pow(height / 4.57, 2 / 9.5));
      case "D":
        return Math.max(1.03, 2.01 * Math.pow(height / 2.13, 2 / 11.5));
      default:
        return 1.0;
    }
  }

  private static calculatePressureCoefficients(
    model: StructuralModel,
    parameters: WindLoadParameters,
  ): { windward: number; leeward: number; sidewall: number; roof: number } {
    // ASCE 7-16 Figure 27.3-1 - External pressure coefficients
    const geometry = model.geometry;
    if (!geometry) {
      return { windward: 0.8, leeward: -0.5, sidewall: -0.7, roof: -0.7 };
    }

    const aspectRatio = geometry.buildingLength / geometry.buildingWidth;
    const heightRatio = geometry.totalHeight / geometry.buildingWidth;

    // Simplified coefficients based on building geometry
    const windward = 0.8;
    const leeward = aspectRatio > 1 ? -0.5 : -0.3;
    const sidewall = -0.7;
    const roof = parameters.roofSlope < 10 ? -0.7 : -0.9;

    return { windward, leeward, sidewall, roof };
  }

  private static generateWindLoadsForMember(
    member: Member,
    model: StructuralModel,
    parameters: WindLoadParameters,
    pressures: {
      windwardPressure: number;
      leewardPressure: number;
      sidewallPressure: number;
      roofPressure: number;
    },
  ): Load[] {
    const loads: Load[] = [];
    const startNode = model.nodes.find((n) => n.id === member.startNodeId);
    const endNode = model.nodes.find((n) => n.id === member.endNodeId);

    if (!startNode || !endNode) return loads;

    const memberLength = Math.sqrt(
      Math.pow(endNode.x - startNode.x, 2) +
        Math.pow(endNode.y - startNode.y, 2) +
        Math.pow(endNode.z - startNode.z, 2),
    );

    // Determine which surface the member belongs to
    let pressure = 0;
    let direction: "X" | "Y" | "Z" = "X";
    const tributaryArea = memberLength * 3.0; // Assume 3m tributary width

    if (member.tag?.includes("RAFTER") || member.tag?.includes("PURLIN")) {
      pressure = pressures.roofPressure;
      direction = "Z";
    } else if (member.tag?.includes("GIRT") || member.tag?.includes("WALL")) {
      // Determine if windward, leeward, or sidewall
      const avgX = (startNode.x + endNode.x) / 2;
      const geometry = model.geometry;

      if (geometry) {
        if (avgX < geometry.buildingLength * 0.1) {
          pressure = pressures.windwardPressure;
        } else if (avgX > geometry.buildingLength * 0.9) {
          pressure = pressures.leewardPressure;
        } else {
          pressure = pressures.sidewallPressure;
        }
      } else {
        pressure = pressures.windwardPressure;
      }
      direction = "X";
    }

    if (Math.abs(pressure) > 0.1) {
      const totalLoad = pressure * tributaryArea;
      loads.push({
        id: `WIND_${member.id}`,
        type: "MEMBER",
        targetId: member.id,
        direction,
        magnitude: totalLoad,
        distribution: "UNIFORM",
      });
    }

    return loads;
  }

  private static calculateLoadSummary(loads: Load[]): {
    totalForce: { x: number; y: number; z: number };
    totalMoment: { x: number; y: number; z: number };
    maxPressure: number;
    minPressure: number;
  } {
    let totalForceX = 0,
      totalForceY = 0,
      totalForceZ = 0;
    let maxPressure = 0,
      minPressure = 0;

    loads.forEach((load) => {
      const magnitude = load.magnitude;

      switch (load.direction) {
        case "X":
        case "LOCAL_X":
          totalForceX += magnitude;
          break;
        case "Y":
        case "LOCAL_Y":
          totalForceY += magnitude;
          break;
        case "Z":
        case "LOCAL_Z":
          totalForceZ += magnitude;
          break;
      }

      maxPressure = Math.max(maxPressure, magnitude);
      minPressure = Math.min(minPressure, magnitude);
    });

    return {
      totalForce: { x: totalForceX, y: totalForceY, z: totalForceZ },
      totalMoment: { x: 0, y: 0, z: 0 }, // Simplified - moments would require more complex calculation
      maxPressure,
      minPressure,
    };
  }
}

// Load combination generator according to ASCE 7-16
export class LoadCombinationGenerator {
  static generateASCE716Combinations(loadResults: LoadCalculationResult[]): {
    name: string;
    factors: { [loadType: string]: number };
    description: string;
  }[] {
    const combinations = [
      {
        name: "1.4D",
        factors: { DEAD: 1.4 },
        description: "Dead load only",
      },
      {
        name: "1.2D + 1.6L + 0.5(Lr or S or R)",
        factors: { DEAD: 1.2, LIVE: 1.6, SNOW: 0.5 },
        description: "Dead + Live + Snow (reduced)",
      },
      {
        name: "1.2D + 1.6(Lr or S or R) + (L or 0.5W)",
        factors: { DEAD: 1.2, SNOW: 1.6, LIVE: 1.0, WIND: 0.5 },
        description: "Dead + Snow + Live (reduced) + Wind (reduced)",
      },
      {
        name: "1.2D + 1.0W + L + 0.5(Lr or S or R)",
        factors: { DEAD: 1.2, WIND: 1.0, LIVE: 1.0, SNOW: 0.5 },
        description: "Dead + Wind + Live + Snow (reduced)",
      },
      {
        name: "1.2D + 1.0E + L + 0.2S",
        factors: { DEAD: 1.2, SEISMIC: 1.0, LIVE: 1.0, SNOW: 0.2 },
        description: "Dead + Seismic + Live + Snow (reduced)",
      },
      {
        name: "0.9D + 1.0W",
        factors: { DEAD: 0.9, WIND: 1.0 },
        description: "Dead (reduced) + Wind - Uplift check",
      },
      {
        name: "0.9D + 1.0E",
        factors: { DEAD: 0.9, SEISMIC: 1.0 },
        description: "Dead (reduced) + Seismic - Uplift check",
      },
    ];

    // Add crane load combinations if crane loads exist
    const hasCraneLoads = loadResults.some((r) => r.loadType === "CRANE");
    if (hasCraneLoads) {
      combinations.push(
        {
          name: "1.2D + 1.6Cr + 0.5L",
          factors: { DEAD: 1.2, CRANE: 1.6, LIVE: 0.5 },
          description: "Dead + Crane + Live (reduced)",
        },
        {
          name: "1.2D + 1.0Cr + 1.0L",
          factors: { DEAD: 1.2, CRANE: 1.0, LIVE: 1.0 },
          description: "Dead + Crane + Live",
        },
      );
    }

    return combinations;
  }
}
