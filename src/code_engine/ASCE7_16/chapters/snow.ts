import { CodeEngineQuery, CodeEngineResponse } from "../index";

// Snow Load Code Data (ASCE 7-16 Chapter 7)
export class SnowCodeData {
  private tables: Map<string, any> = new Map();
  private equations: Map<string, any> = new Map();
  private limits: Map<string, any> = new Map();

  constructor() {
    this.initializeTables();
    this.initializeEquations();
    this.initializeLimits();
  }

  private initializeTables(): void {
    // Table 7.3-1: Exposure Factor Ce
    this.tables.set("7.3-1", {
      title: "Exposure Factor, Ce",
      source: "ASCE 7-16 Table 7.3-1",
      note: "Flat roof snow loads",
      data: {
        fullyExposed: {
          value: 0.9,
          description: "Roof exposed on all sides with no shelter",
        },
        partiallyExposed: {
          value: 1.0,
          description:
            "Roof exposed on all sides with some shelter from terrain, higher structures, or trees",
        },
        sheltered: {
          value: 1.2,
          description:
            "Roof located tight among conifers that qualify as obstructions",
        },
      },
      applicability: [
        "Terrain category and roof exposure",
        "Obstructions within distance of 10ho from roof",
      ],
    });

    // Table 7.3-2: Thermal Factor Ct
    this.tables.set("7.3-2", {
      title: "Thermal Factor, Ct",
      source: "ASCE 7-16 Table 7.3-2",
      note: "Flat roof snow loads",
      data: {
        heated: {
          value: 1.0,
          description: "Heated structures",
        },
        unheated: {
          value: 1.1,
          description: "Unheated structures",
        },
        openAir: {
          value: 1.2,
          description:
            "Structures kept just above freezing and others with cold, ventilated roofs",
        },
        greenhouse: {
          value: 0.85,
          description: "Continuously heated greenhouses with roof slope < 3/12",
        },
      },
      applicability: [
        "Building thermal conditions",
        "Roof ventilation characteristics",
      ],
    });

    // Table 7.4-1: Snow Load Shape Factors
    this.tables.set("7.4-1", {
      title: "Snow Load Shape Factors for Sloped Roofs",
      source: "ASCE 7-16 Table 7.4-1",
      note: "Sloped roof snow loads",
      data: {
        warmRoof: {
          "slope_0-15": 1.0,
          slope_20: 0.9,
          slope_25: 0.8,
          slope_30: 0.7,
          slope_35: 0.6,
          slope_40: 0.5,
          slope_45: 0.4,
          slope_50: 0.3,
          slope_55: 0.2,
          slope_60: 0.1,
          "slope_70+": 0.0,
        },
        coldRoof: {
          "slope_0-15": 1.0,
          slope_20: 1.0,
          slope_25: 1.0,
          slope_30: 1.0,
          slope_35: 1.0,
          slope_40: 0.8,
          slope_45: 0.6,
          slope_50: 0.4,
          slope_55: 0.2,
          slope_60: 0.0,
          "slope_70+": 0.0,
        },
        curvedRoof: {
          note: "Use Section 7.4.4 for curved roofs",
        },
        sawtoothRoof: {
          note: "Use Section 7.4.5 for sawtooth roofs",
        },
      },
      applicability: [
        "Roof slope in degrees from horizontal",
        "Warm roof: Ct ≤ 1.0, Cold roof: Ct > 1.0",
        "Linear interpolation permitted between values",
      ],
    });

    // Table 7.6-1: Importance Factor Is
    this.tables.set("7.6-1", {
      title: "Snow Load Importance Factor, Is",
      source: "ASCE 7-16 Table 7.6-1",
      note: "Snow importance factor",
      data: {
        riskCategoryI: {
          value: 0.8,
          description:
            "Buildings and other structures that represent a low risk to human life",
        },
        riskCategoryII: {
          value: 1.0,
          description:
            "Buildings and other structures except those in Risk Categories I, III, and IV",
        },
        riskCategoryIII: {
          value: 1.1,
          description:
            "Buildings and other structures that represent a substantial risk to human life",
        },
        riskCategoryIV: {
          value: 1.2,
          description:
            "Buildings and other structures designated as essential facilities",
        },
      },
      applicability: ["Based on Risk Category per Table 1.5-1"],
    });
  }

  private initializeEquations(): void {
    // Equation 7.3-1: Flat Roof Snow Load
    this.equations.set("7.3-1", {
      title: "Flat Roof Snow Load",
      source: "ASCE 7-16 Equation 7.3-1",
      equation: "pf = 0.7CeCtIspg",
      variables: {
        pf: "Snow load on flat roof (psf or kN/m²)",
        Ce: "Exposure factor",
        Ct: "Thermal factor",
        Is: "Importance factor",
        pg: "Ground snow load (psf or kN/m²)",
      },
      note: "Minimum pf = 20Is psf (0.96Is kN/m²) for pg ≤ 20 psf",
      applicability: [
        "Flat roofs and roofs with slopes ≤ 5°",
        "Subject to minimum values per Section 7.3.4",
      ],
    });

    // Equation 7.4-1: Sloped Roof Snow Load
    this.equations.set("7.4-1", {
      title: "Sloped Roof Snow Load",
      source: "ASCE 7-16 Equation 7.4-1",
      equation: "ps = Cspf",
      variables: {
        ps: "Snow load on sloped roof (psf or kN/m²)",
        Cs: "Roof slope factor",
        pf: "Snow load on flat roof (psf or kN/m²)",
      },
      note: "Roof slope factor from Table 7.4-1",
      applicability: ["Sloped roofs", "Unbalanced snow loads per Section 7.5"],
    });

    // Equation 7.7-1: Rain-on-Snow Surcharge Load
    this.equations.set("7.7-1", {
      title: "Rain-on-Snow Surcharge Load",
      source: "ASCE 7-16 Equation 7.7-1",
      equation: "pr = 0.4pf",
      variables: {
        pr: "Rain-on-snow surcharge load (psf or kN/m²)",
        pf: "Snow load on flat roof (psf or kN/m²)",
      },
      note: "Applied where pg ≤ 20 psf and roof slope < 1/2 inch per foot",
      applicability: [
        "Low-slope roofs in areas with light ground snow loads",
        "Combined with flat roof snow load",
      ],
    });

    // Equation 7.8-1: Ponding Instability Load
    this.equations.set("7.8-1", {
      title: "Ponding Instability",
      source: "ASCE 7-16 Equation 7.8-1",
      equation: "pp = 5γ(S²/10⁶)",
      variables: {
        pp: "Ponding instability load (psf)",
        γ: "Unit weight of water (62.4 pcf)",
        S: "Spacing of secondary members (inches)",
      },
      note: "For flexible roof systems",
      applicability: [
        "Roofs susceptible to ponding",
        "Combined with other roof loads",
      ],
    });
  }

  private initializeLimits(): void {
    // Ground Snow Load Limits
    this.limits.set("ground-snow", {
      title: "Ground Snow Load Limits",
      source: "ASCE 7-16 Section 7.2",
      limits: {
        minimum: {
          value: 0,
          unit: "psf",
          note: "Areas with no snow load",
        },
        maximum: {
          value: 300,
          unit: "psf",
          note: "Extreme snow load areas require special study",
        },
        caseStudy: {
          threshold: 100,
          unit: "psf",
          note: "Ground snow loads > 100 psf may require case study",
        },
      },
    });

    // Roof Slope Limits
    this.limits.set("roof-slope", {
      title: "Roof Slope Considerations",
      source: "ASCE 7-16 Section 7.4",
      limits: {
        flatRoof: {
          value: 5,
          unit: "degrees",
          note: "Roofs with slopes ≤ 5° considered flat",
        },
        noSnowLoad: {
          warm: 70,
          cold: 60,
          unit: "degrees",
          note: "Minimum slope for zero snow load",
        },
        slidingSnow: {
          threshold: 15,
          unit: "degrees",
          note: "Consider sliding snow loads for slopes > 15°",
        },
      },
    });

    // Minimum Snow Loads
    this.limits.set("minimum-loads", {
      title: "Minimum Snow Load Requirements",
      source: "ASCE 7-16 Section 7.3.4",
      limits: {
        flatRoof: {
          value: 20,
          unit: "psf",
          factor: "Is",
          note: "Minimum flat roof snow load = 20Is psf",
        },
        slopedRoof: {
          note: "Minimum sloped roof snow load per Section 7.4.6",
        },
        specialCases: {
          greenhouse: {
            value: 10,
            unit: "psf",
            note: "Minimum for continuously heated greenhouses",
          },
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
            source: "Snow Code Data",
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        source: "Snow Code Data",
      };
    }
  }

  private getTable(reference: string): CodeEngineResponse {
    const table = this.tables.get(reference);
    if (!table) {
      return {
        success: false,
        error: `Table ${reference} not found`,
        source: "Snow Code Data",
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
        source: "Snow Code Data",
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
        source: "Snow Code Data",
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
    return {
      success: false,
      error: `Text reference ${reference} not implemented`,
      source: "Snow Code Data",
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
