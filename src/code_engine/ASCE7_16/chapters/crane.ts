import { CodeEngineQuery, CodeEngineResponse } from "../index";

// ASCE 7-16 Chapter 4.9 - Crane Loads
export class CraneCodeData {
  private tables: Map<string, any> = new Map();
  private equations: Map<string, any> = new Map();
  private limits: Map<string, any> = new Map();

  constructor() {
    this.initializeTables();
    this.initializeEquations();
    this.initializeLimits();
  }

  private initializeTables(): void {
    // Table 4.9-1: Crane Load Factors
    this.tables.set("4.9-1", {
      title: "Crane Load Factors",
      description: "Load factors for crane loads in various load combinations",
      headers: [
        "Load Combination",
        "Vertical Crane Load Factor",
        "Horizontal Crane Load Factor",
      ],
      data: [
        ["1.2D + 1.6L + 0.5(Lr or S or R)", "1.6", "1.6"],
        ["1.2D + 1.6(Lr or S or R) + (L or 0.5W)", "1.0 or 0.5", "1.0 or 0.5"],
        ["1.2D + 1.0W + L + 0.5(Lr or S or R)", "1.0", "1.0"],
        ["1.2D + 1.0E + L + 0.2S", "1.0", "1.0"],
        ["0.9D + 1.0W", "0", "0"],
        ["0.9D + 1.0E", "0", "0"],
      ],
      notes: [
        "L = Live load from crane",
        "Vertical and horizontal crane loads shall be considered simultaneously",
        "Impact factors are included in the specified loads",
      ],
      applicability: [
        "All crane-supported structures",
        "Overhead traveling cranes",
        "Monorail cranes",
        "Jib cranes",
      ],
    });

    // Table 4.9-2: Crane Impact Factors
    this.tables.set("4.9-2", {
      title: "Crane Impact Factors",
      description: "Impact factors for different types of crane operations",
      headers: [
        "Crane Type",
        "Vertical Impact Factor",
        "Horizontal Impact Factor",
      ],
      data: [
        ["Overhead traveling cranes (powered)", "1.25", "1.10"],
        ["Overhead traveling cranes (hand-operated)", "1.10", "1.05"],
        ["Monorail cranes (powered)", "1.25", "1.10"],
        ["Monorail cranes (hand-operated)", "1.10", "1.05"],
        ["Jib cranes (powered)", "1.25", "1.10"],
        ["Jib cranes (hand-operated)", "1.10", "1.05"],
        ["Bridge cranes (top running)", "1.25", "1.10"],
        ["Bridge cranes (underhung)", "1.15", "1.05"],
      ],
      notes: [
        "Impact factors account for dynamic effects",
        "Apply to both lifted load and crane weight",
        "Consider simultaneous vertical and horizontal effects",
      ],
      applicability: [
        "All crane types listed",
        "Normal operating conditions",
        "Standard duty cycles",
      ],
    });

    // Table 4.9-3: Crane Runway Beam Design Forces
    this.tables.set("4.9-3", {
      title: "Crane Runway Beam Design Forces",
      description: "Design forces for crane runway beams",
      headers: ["Force Type", "Direction", "Magnitude", "Application Point"],
      data: [
        [
          "Vertical wheel load",
          "Downward",
          "(DL + LL) × Impact Factor",
          "Wheel contact point",
        ],
        [
          "Lateral force",
          "Horizontal (transverse)",
          "20% of lifted load + crane weight",
          "Top of rail",
        ],
        [
          "Longitudinal force",
          "Horizontal (along runway)",
          "10% of max wheel loads",
          "Top of rail",
        ],
        [
          "Traction force",
          "Horizontal (along runway)",
          "Per crane manufacturer",
          "Wheel contact point",
        ],
        [
          "Braking force",
          "Horizontal (along runway)",
          "10% of lifted load",
          "Top of rail",
        ],
      ],
      notes: [
        "All forces shall be considered simultaneously where applicable",
        "Lateral force includes effects of misalignment and skewing",
        "Longitudinal forces from acceleration/deceleration",
      ],
      applicability: [
        "Crane runway beam design",
        "Supporting structure design",
        "Connection design",
      ],
    });

    // Table 4.9-4: Crane Load Combinations
    this.tables.set("4.9-4", {
      title: "Crane Load Combinations for Structural Design",
      description:
        "Load combinations specifically for crane-supported structures",
      headers: ["Load Combination", "Description", "Application"],
      data: [
        ["1.4(D + F)", "Dead + Fluid loads only", "Basic structural adequacy"],
        [
          "1.2(D + F + T) + 1.6(L + H) + 0.5(Lr or S or R)",
          "Normal operating",
          "Standard crane operations",
        ],
        [
          "1.2D + 1.6(Lr or S or R) + (f1L or 0.5W)",
          "Roof/snow critical",
          "Non-operating conditions",
        ],
        [
          "1.2D + 1.0W + f1L + 0.5(Lr or S or R)",
          "Wind critical",
          "Operating in wind",
        ],
        ["1.2D + 1.0E + f1L + 0.2S", "Seismic critical", "Seismic design"],
        ["0.9D + 1.0W", "Uplift check", "Wind uplift"],
        ["0.9D + 1.0E", "Uplift check", "Seismic uplift"],
      ],
      notes: [
        "f1 = 1.0 for cranes with capacity ≥ 5 tons",
        "f1 = 0.5 for cranes with capacity < 5 tons",
        "H = lateral earth pressure",
        "F = fluid pressure",
      ],
      applicability: [
        "All crane-supported structures",
        "LRFD design method",
        "Ultimate strength design",
      ],
    });
  }

  private initializeEquations(): void {
    // Equation 4.9-1: Vertical Crane Load
    this.equations.set("4.9-1", {
      title: "Vertical Crane Load",
      equation: "Pv = (DL_crane + LL_lifted) × I_v",
      variables: {
        Pv: "Vertical crane load (kN or lbs)",
        DL_crane: "Dead load of crane (kN or lbs)",
        LL_lifted: "Live load being lifted (kN or lbs)",
        I_v: "Vertical impact factor from Table 4.9-2",
      },
      notes: [
        "Apply at wheel contact points",
        "Consider maximum lifted load",
        "Include crane self-weight",
      ],
      applicability: "All crane types",
    });

    // Equation 4.9-2: Horizontal Lateral Force
    this.equations.set("4.9-2", {
      title: "Horizontal Lateral Force",
      equation: "Ph = 0.20 × (DL_crane + LL_lifted) × I_h",
      variables: {
        Ph: "Horizontal lateral force (kN or lbs)",
        DL_crane: "Dead load of crane (kN or lbs)",
        LL_lifted: "Live load being lifted (kN or lbs)",
        I_h: "Horizontal impact factor from Table 4.9-2",
      },
      notes: [
        "Applied at top of rail",
        "Accounts for misalignment and skewing",
        "Consider both directions",
      ],
      applicability: "All crane runway systems",
    });

    // Equation 4.9-3: Longitudinal Force
    this.equations.set("4.9-3", {
      title: "Longitudinal Force",
      equation: "Pl = 0.10 × Pv_max",
      variables: {
        Pl: "Longitudinal force (kN or lbs)",
        Pv_max: "Maximum vertical wheel load (kN or lbs)",
      },
      notes: [
        "Applied at top of rail",
        "Due to acceleration/deceleration",
        "Consider both directions along runway",
      ],
      applicability: "Powered crane systems",
    });

    // Equation 4.9-4: Braking Force
    this.equations.set("4.9-4", {
      title: "Braking Force",
      equation: "Pb = 0.10 × LL_lifted",
      variables: {
        Pb: "Braking force (kN or lbs)",
        LL_lifted: "Live load being lifted (kN or lbs)",
      },
      notes: [
        "Applied at top of rail",
        "Due to load braking",
        "Consider direction of travel",
      ],
      applicability: "All crane operations with lifted loads",
    });
  }

  private initializeLimits(): void {
    // Crane capacity limits
    this.limits.set("capacity", {
      title: "Crane Capacity Limits",
      limits: {
        minimum_capacity: {
          value: 0.5,
          unit: "tons",
          description: "Minimum capacity for impact factor application",
        },
        heavy_duty_threshold: {
          value: 5.0,
          unit: "tons",
          description: "Threshold for heavy-duty crane classification",
        },
        maximum_span: {
          value: 30.0,
          unit: "m",
          description: "Maximum recommended span for single girder cranes",
        },
      },
      notes: [
        "Capacities based on rated lifting capacity",
        "Consider duty cycle classification",
        "Verify with crane manufacturer specifications",
      ],
    });

    // Runway beam limits
    this.limits.set("runway", {
      title: "Crane Runway Limits",
      limits: {
        deflection_limit: {
          value: "L/600",
          unit: "ratio",
          description: "Maximum vertical deflection under crane loads",
        },
        lateral_deflection_limit: {
          value: "L/400",
          unit: "ratio",
          description: "Maximum lateral deflection",
        },
        rail_tolerance: {
          value: 3.0,
          unit: "mm",
          description: "Maximum rail alignment tolerance",
        },
        runway_grade: {
          value: 0.2,
          unit: "percent",
          description: "Maximum runway grade",
        },
      },
      notes: [
        "L = span length of runway beam",
        "Deflection limits for normal operation",
        "Tighter tolerances may be required for precision cranes",
      ],
    });

    // Load factor limits
    this.limits.set("load_factors", {
      title: "Crane Load Factor Limits",
      limits: {
        vertical_impact_max: {
          value: 1.25,
          unit: "factor",
          description: "Maximum vertical impact factor",
        },
        horizontal_impact_max: {
          value: 1.1,
          unit: "factor",
          description: "Maximum horizontal impact factor",
        },
        lateral_force_ratio: {
          value: 0.2,
          unit: "ratio",
          description: "Lateral force as ratio of vertical load",
        },
        longitudinal_force_ratio: {
          value: 0.1,
          unit: "ratio",
          description: "Longitudinal force as ratio of wheel load",
        },
      },
      notes: [
        "Impact factors include dynamic amplification",
        "Ratios are minimum requirements",
        "Higher values may be specified by manufacturer",
      ],
    });
  }

  // Main query method
  query(request: CodeEngineQuery): CodeEngineResponse {
    try {
      console.log("🏗️ Crane Code Data Query:", request);

      switch (request.type) {
        case "table":
          return this.getTable(request.reference);
        case "equation":
          return this.getEquation(request.reference);
        case "limit":
          return this.getLimit(request.reference);
        case "text":
          return this.getText(request.reference);
        default:
          return {
            success: false,
            error: `Unsupported query type: ${request.type}`,
            source: "ASCE 7-16 Chapter 4.9 - Crane Loads",
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        source: "ASCE 7-16 Chapter 4.9 - Crane Loads",
      };
    }
  }

  private getTable(reference: string): CodeEngineResponse {
    const table = this.tables.get(reference);
    if (!table) {
      return {
        success: false,
        error: `Table ${reference} not found`,
        source: "ASCE 7-16 Chapter 4.9 - Crane Loads",
      };
    }

    return {
      success: true,
      data: table,
      source: `ASCE 7-16 Table ${reference}`,
      note: "Crane load data per ASCE 7-16 Chapter 4.9",
    };
  }

  private getEquation(reference: string): CodeEngineResponse {
    const equation = this.equations.get(reference);
    if (!equation) {
      return {
        success: false,
        error: `Equation ${reference} not found`,
        source: "ASCE 7-16 Chapter 4.9 - Crane Loads",
      };
    }

    return {
      success: true,
      data: equation,
      source: `ASCE 7-16 Equation ${reference}`,
      note: "Crane load calculation per ASCE 7-16 Chapter 4.9",
    };
  }

  private getLimit(reference: string): CodeEngineResponse {
    const limit = this.limits.get(reference);
    if (!limit) {
      return {
        success: false,
        error: `Limit ${reference} not found`,
        source: "ASCE 7-16 Chapter 4.9 - Crane Loads",
      };
    }

    return {
      success: true,
      data: limit,
      source: `ASCE 7-16 Chapter 4.9 Limits`,
      note: "Crane design limits per ASCE 7-16",
    };
  }

  private getText(reference: string): CodeEngineResponse {
    const textData = {
      "4.9": {
        title: "Crane Loads - General Requirements",
        content:
          "Structures supporting cranes shall be designed for the loads and forces transmitted to the structure by the crane. The loads shall include the weight of the crane, the lifted load, and the dynamic effects of the crane operation.",
        sections: [
          "4.9.1 - General requirements for crane loads",
          "4.9.2 - Vertical loads from cranes",
          "4.9.3 - Horizontal loads from cranes",
          "4.9.4 - Load combinations for crane-supported structures",
        ],
      },
      "4.9.1": {
        title: "General Requirements",
        content:
          "The structural design of crane-supporting structures shall consider all applicable loads including dead loads, live loads, environmental loads, and crane-specific loads with appropriate load factors and combinations.",
      },
      "4.9.2": {
        title: "Vertical Crane Loads",
        content:
          "Vertical loads shall include the weight of the crane and the maximum lifted load, increased by impact factors to account for dynamic effects during crane operation.",
      },
      "4.9.3": {
        title: "Horizontal Crane Loads",
        content:
          "Horizontal loads shall include lateral forces due to crane operation, longitudinal forces from acceleration and deceleration, and forces from misalignment and skewing of the crane.",
      },
    };

    const text = textData[reference as keyof typeof textData];
    if (!text) {
      return {
        success: false,
        error: `Text reference ${reference} not found`,
        source: "ASCE 7-16 Chapter 4.9 - Crane Loads",
      };
    }

    return {
      success: true,
      data: text,
      source: `ASCE 7-16 Section ${reference}`,
      note: "Crane load requirements per ASCE 7-16",
    };
  }

  // Export all crane data
  exportData(): any {
    return {
      tables: Object.fromEntries(this.tables),
      equations: Object.fromEntries(this.equations),
      limits: Object.fromEntries(this.limits),
      metadata: {
        chapter: "4.9",
        title: "Crane Loads",
        totalTables: this.tables.size,
        totalEquations: this.equations.size,
        totalLimits: this.limits.size,
      },
    };
  }

  // Get available references
  getAvailableReferences(): string[] {
    return [
      ...Array.from(this.tables.keys()),
      ...Array.from(this.equations.keys()),
      ...Array.from(this.limits.keys()),
    ];
  }
}
