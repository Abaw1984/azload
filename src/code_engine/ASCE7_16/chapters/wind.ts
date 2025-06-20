import { CodeEngineQuery, CodeEngineResponse } from "../index";

// Wind Load Code Data (ASCE 7-16 Chapters 27-30)
export class WindCodeData {
  private tables: Map<string, any> = new Map();
  private equations: Map<string, any> = new Map();
  private limits: Map<string, any> = new Map();

  constructor() {
    this.initializeTables();
    this.initializeEquations();
    this.initializeLimits();
  }

  private initializeTables(): void {
    // Table 26.10-1: Velocity Pressure Exposure Coefficients
    this.tables.set("26.10-1", {
      title: "Velocity Pressure Exposure Coefficients, Kz and Kh",
      source: "ASCE 7-16 Table 26.10-1",
      note: "For buildings and other structures",
      data: {
        exposureB: {
          heights: [
            0, 4.6, 6.1, 7.6, 9.1, 12.2, 15.2, 18.3, 21.3, 24.4, 30.5, 36.6,
            45.7, 61.0, 76.2, 91.4, 106.7, 121.9, 152.4, 182.9,
          ],
          kz: [
            0.7, 0.7, 0.7, 0.7, 0.7, 0.76, 0.81, 0.85, 0.89, 0.93, 1.0, 1.07,
            1.15, 1.31, 1.43, 1.53, 1.61, 1.68, 1.79, 1.87,
          ],
        },
        exposureC: {
          heights: [
            0, 4.6, 6.1, 7.6, 9.1, 12.2, 15.2, 18.3, 21.3, 24.4, 30.5, 36.6,
            45.7, 61.0, 76.2, 91.4, 106.7, 121.9, 152.4, 182.9,
          ],
          kz: [
            0.85, 0.85, 0.85, 0.85, 0.85, 0.9, 0.94, 0.98, 1.02, 1.04, 1.09,
            1.13, 1.19, 1.31, 1.4, 1.48, 1.55, 1.61, 1.73, 1.81,
          ],
        },
        exposureD: {
          heights: [
            0, 4.6, 6.1, 7.6, 9.1, 12.2, 15.2, 18.3, 21.3, 24.4, 30.5, 36.6,
            45.7, 61.0, 76.2, 91.4, 106.7, 121.9, 152.4, 182.9,
          ],
          kz: [
            1.03, 1.08, 1.12, 1.16, 1.19, 1.25, 1.31, 1.36, 1.39, 1.43, 1.5,
            1.55, 1.63, 1.78, 1.89, 2.0, 2.09, 2.17, 2.31, 2.42,
          ],
        },
      },
      applicability: [
        "Buildings and other structures",
        "Height measured from ground level",
        "Linear interpolation permitted between tabulated values",
      ],
    });

    // Table 27.3-1: External Pressure Coefficients for MWFRS
    this.tables.set("27.3-1", {
      title: "External Pressure Coefficients, Cp, for Buildings - MWFRS",
      source: "ASCE 7-16 Table 27.3-1",
      note: "Main Wind Force Resisting System",
      data: {
        walls: {
          windward: {
            allHeights: 0.8,
          },
          leeward: {
            "L/B_0-1": -0.5,
            "L/B_2": -0.3,
            "L/B_4+": -0.2,
          },
          sidewalls: {
            allRatios: -0.7,
          },
        },
        roofs: {
          windward: {
            "slope_0-10": {
              "h/L_0.25": -0.7,
              "h/L_0.5": -0.5,
              "h/L_1.0": -0.3,
              "h/L_2.0+": -0.2,
            },
            slope_15: {
              "h/L_0.25": -0.5,
              "h/L_0.5": -0.5,
              "h/L_1.0": -0.2,
              "h/L_2.0+": 0.0,
            },
            slope_20: {
              "h/L_0.25": -0.3,
              "h/L_0.5": -0.2,
              "h/L_1.0": 0.0,
              "h/L_2.0+": 0.2,
            },
            slope_25: {
              "h/L_0.25": -0.2,
              "h/L_0.5": 0.0,
              "h/L_1.0": 0.2,
              "h/L_2.0+": 0.3,
            },
            "slope_30-45": {
              "h/L_0.25": 0.0,
              "h/L_0.5": 0.2,
              "h/L_1.0": 0.4,
              "h/L_2.0+": 0.5,
            },
          },
          leeward: {
            allSlopes: -0.3,
          },
        },
      },
      applicability: [
        "Enclosed and partially enclosed buildings",
        "h = mean roof height",
        "L = horizontal dimension parallel to wind direction",
        "B = horizontal dimension perpendicular to wind direction",
      ],
    });

    // Table 26.6-1: Internal Pressure Coefficients
    this.tables.set("26.6-1", {
      title: "Internal Pressure Coefficients, GCpi",
      source: "ASCE 7-16 Table 26.6-1",
      note: "For buildings",
      data: {
        enclosed: {
          positive: 0.18,
          negative: -0.18,
        },
        partiallyEnclosed: {
          positive: 0.55,
          negative: -0.55,
        },
        open: {
          positive: 0.0,
          negative: 0.0,
        },
      },
      applicability: [
        "Use both positive and negative values",
        "Determine enclosure classification per Section 26.2",
      ],
    });

    // Table 26.8-1: Gust Effect Factor
    this.tables.set("26.8-1", {
      title: "Gust Effect Factor, G or Gf",
      source: "ASCE 7-16 Table 26.8-1",
      note: "For rigid and flexible structures",
      data: {
        rigid: {
          value: 0.85,
          condition: "Fundamental frequency ≥ 1 Hz",
        },
        flexible: {
          condition: "Fundamental frequency < 1 Hz",
          calculation: "Use Section 26.9 for detailed calculation",
        },
      },
      applicability: [
        "Rigid structures: G = 0.85",
        "Flexible structures: Calculate per Section 26.9",
      ],
    });
  }

  private initializeEquations(): void {
    // Equation 27.3-1: Design Wind Pressure
    this.equations.set("27.3-1", {
      title: "Design Wind Pressure - MWFRS",
      source: "ASCE 7-16 Equation 27.3-1",
      equation: "p = qGCp - qi(GCpi)",
      variables: {
        p: "Design wind pressure (psf or Pa)",
        q: "Velocity pressure at height z (psf or Pa)",
        G: "Gust effect factor",
        Cp: "External pressure coefficient",
        qi: "Velocity pressure for internal pressure evaluation",
        GCpi: "Internal pressure coefficient",
      },
      note: "For main wind force resisting system",
      applicability: [
        "Buildings of all heights",
        "Enclosed and partially enclosed buildings",
      ],
    });

    // Equation 26.6-1: Velocity Pressure
    this.equations.set("26.6-1", {
      title: "Velocity Pressure",
      source: "ASCE 7-16 Equation 26.6-1",
      equation: "qz = 0.00256KzKztKdV²I",
      variables: {
        qz: "Velocity pressure at height z (psf)",
        Kz: "Velocity pressure exposure coefficient",
        Kzt: "Topographic factor",
        Kd: "Wind directionality factor",
        V: "Basic wind speed (mph)",
        I: "Importance factor",
      },
      note: "For Imperial units (psf, mph)",
      siEquation: "qz = 0.613KzKztKdV²I",
      siNote: "For SI units (Pa, m/s)",
      applicability: ["All structures", "Height z above ground level"],
    });
  }

  private initializeLimits(): void {
    // Wind Speed Limits
    this.limits.set("wind-speed", {
      title: "Basic Wind Speed Limits",
      source: "ASCE 7-16 Section 26.5",
      limits: {
        minimum: {
          value: 85,
          unit: "mph",
          note: "Minimum basic wind speed for design",
        },
        maximum: {
          value: 200,
          unit: "mph",
          note: "Maximum tabulated wind speed",
        },
        specialRegions: {
          note: "Special wind regions require site-specific analysis",
        },
      },
    });

    // Height Limits
    this.limits.set("height", {
      title: "Height Limitations",
      source: "ASCE 7-16 Various Sections",
      limits: {
        lowRise: {
          value: 60,
          unit: "ft",
          metric: 18.3,
          metricUnit: "m",
          note: "Low-rise building definition",
        },
        rigidStructure: {
          frequency: 1,
          unit: "Hz",
          note: "Minimum frequency for rigid structure classification",
        },
      },
    });
  }

  query(request: CodeEngineQuery): CodeEngineResponse {
    try {
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
            source: "Wind Code Data",
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        source: "Wind Code Data",
      };
    }
  }

  private getTable(reference: string): CodeEngineResponse {
    const table = this.tables.get(reference);
    if (!table) {
      return {
        success: false,
        error: `Table ${reference} not found`,
        source: "Wind Code Data",
      };
    }

    return {
      success: true,
      data: table,
      source: table.source,
      note: table.note,
      applicabilityLimits: table.applicability,
    };
  }

  private getEquation(reference: string): CodeEngineResponse {
    const equation = this.equations.get(reference);
    if (!equation) {
      return {
        success: false,
        error: `Equation ${reference} not found`,
        source: "Wind Code Data",
      };
    }

    return {
      success: true,
      data: equation,
      source: equation.source,
      note: equation.note,
      applicabilityLimits: equation.applicability,
    };
  }

  private getLimit(reference: string): CodeEngineResponse {
    const limit = this.limits.get(reference);
    if (!limit) {
      return {
        success: false,
        error: `Limit ${reference} not found`,
        source: "Wind Code Data",
      };
    }

    return {
      success: true,
      data: limit,
      source: limit.source,
      note: limit.note,
    };
  }

  private getText(reference: string): CodeEngineResponse {
    // Placeholder for text-based code provisions
    return {
      success: false,
      error: `Text reference ${reference} not implemented`,
      source: "Wind Code Data",
    };
  }

  exportData(): any {
    return {
      tables: Object.fromEntries(this.tables),
      equations: Object.fromEntries(this.equations),
      limits: Object.fromEntries(this.limits),
    };
  }
}
