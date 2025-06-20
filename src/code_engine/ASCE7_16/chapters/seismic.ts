import { CodeEngineQuery, CodeEngineResponse } from "../index";

// Seismic Load Code Data (ASCE 7-16 Chapters 11-16)
export class SeismicCodeData {
  private tables: Map<string, any> = new Map();
  private equations: Map<string, any> = new Map();
  private limits: Map<string, any> = new Map();

  constructor() {
    this.initializeTables();
    this.initializeEquations();
    this.initializeLimits();
  }

  private initializeTables(): void {
    // Table 11.4-1: Site Coefficient Fa
    this.tables.set("11.4-1", {
      title: "Site Coefficient Fa",
      source: "ASCE 7-16 Table 11.4-1",
      note: "Site coefficient for short periods",
      data: {
        siteClassA: {
          "ss_0.25": 0.8,
          "ss_0.5": 0.8,
          "ss_0.75": 0.8,
          "ss_1.0": 0.8,
          "ss_1.25": 0.8,
          "ss_1.5": 0.8,
          "ss_1.75": 0.8,
          "ss_2.0+": 0.8,
        },
        siteClassB: {
          "ss_0.25": 1.0,
          "ss_0.5": 1.0,
          "ss_0.75": 1.0,
          "ss_1.0": 1.0,
          "ss_1.25": 1.0,
          "ss_1.5": 1.0,
          "ss_1.75": 1.0,
          "ss_2.0+": 1.0,
        },
        siteClassC: {
          "ss_0.25": 1.2,
          "ss_0.5": 1.2,
          "ss_0.75": 1.1,
          "ss_1.0": 1.0,
          "ss_1.25": 1.0,
          "ss_1.5": 1.0,
          "ss_1.75": 1.0,
          "ss_2.0+": 1.0,
        },
        siteClassD: {
          "ss_0.25": 1.6,
          "ss_0.5": 1.4,
          "ss_0.75": 1.2,
          "ss_1.0": 1.1,
          "ss_1.25": 1.0,
          "ss_1.5": 1.0,
          "ss_1.75": 1.0,
          "ss_2.0+": 1.0,
        },
        siteClassE: {
          "ss_0.25": 2.5,
          "ss_0.5": 1.8,
          "ss_0.75": 1.8,
          "ss_1.0": 1.5,
          "ss_1.25": 1.5,
          "ss_1.5": 1.5,
          "ss_1.75": 1.4,
          "ss_2.0+": 1.4,
        },
        siteClassF: {
          note: "Site-specific geotechnical investigation required",
        },
      },
      applicability: [
        "Ss = mapped spectral acceleration parameter",
        "Use linear interpolation for intermediate values",
      ],
    });

    // Table 11.4-2: Site Coefficient Fv
    this.tables.set("11.4-2", {
      title: "Site Coefficient Fv",
      source: "ASCE 7-16 Table 11.4-2",
      note: "Site coefficient for 1-second periods",
      data: {
        siteClassA: {
          "s1_0.1": 0.8,
          "s1_0.2": 0.8,
          "s1_0.3": 0.8,
          "s1_0.4": 0.8,
          "s1_0.5": 0.8,
          "s1_0.6+": 0.8,
        },
        siteClassB: {
          "s1_0.1": 1.0,
          "s1_0.2": 1.0,
          "s1_0.3": 1.0,
          "s1_0.4": 1.0,
          "s1_0.5": 1.0,
          "s1_0.6+": 1.0,
        },
        siteClassC: {
          "s1_0.1": 1.8,
          "s1_0.2": 1.6,
          "s1_0.3": 1.5,
          "s1_0.4": 1.4,
          "s1_0.5": 1.3,
          "s1_0.6+": 1.2,
        },
        siteClassD: {
          "s1_0.1": 2.4,
          "s1_0.2": 2.0,
          "s1_0.3": 1.8,
          "s1_0.4": 1.6,
          "s1_0.5": 1.5,
          "s1_0.6+": 1.5,
        },
        siteClassE: {
          "s1_0.1": 3.5,
          "s1_0.2": 3.2,
          "s1_0.3": 2.8,
          "s1_0.4": 2.4,
          "s1_0.5": 2.4,
          "s1_0.6+": 2.4,
        },
        siteClassF: {
          note: "Site-specific geotechnical investigation required",
        },
      },
      applicability: [
        "S1 = mapped spectral acceleration parameter",
        "Use linear interpolation for intermediate values",
      ],
    });

    // Table 12.2-1: Seismic Design Category
    this.tables.set("12.2-1", {
      title:
        "Seismic Design Category Based on Short Period Response Acceleration Parameter",
      source: "ASCE 7-16 Table 12.2-1",
      note: "Risk Category I, II, III structures",
      data: {
        riskCategoryI_II: {
          "sds_lt_0.167": "A",
          "sds_0.167_to_0.33": "B",
          "sds_0.33_to_0.50": "C",
          "sds_gte_0.50": "D",
        },
        riskCategoryIII: {
          "sds_lt_0.167": "A",
          "sds_0.167_to_0.33": "B",
          "sds_0.33_to_0.50": "C",
          "sds_gte_0.50": "D",
        },
        riskCategoryIV: {
          "sds_lt_0.167": "A",
          "sds_0.167_to_0.33": "C",
          "sds_0.33_to_0.50": "D",
          "sds_gte_0.50": "D",
        },
      },
      applicability: [
        "SDS = design spectral response acceleration parameter",
        "Use most restrictive category from Tables 12.2-1 and 12.2-2",
      ],
    });

    // Table 12.8-1: Response Modification Coefficient R
    this.tables.set("12.8-1", {
      title: "Response Modification Coefficient, R, for Building Frame Systems",
      source: "ASCE 7-16 Table 12.2-1",
      note: "Seismic force-resisting systems",
      data: {
        steelSystems: {
          special_moment_frame: {
            R: 8,
            Omega0: 3,
            Cd: 5.5,
            heightLimit: "NL",
          },
          intermediate_moment_frame: {
            R: 4.5,
            Omega0: 3,
            Cd: 4,
            heightLimit: 35,
          },
          ordinary_moment_frame: {
            R: 3.5,
            Omega0: 3,
            Cd: 3,
            heightLimit: "NP",
          },
          special_concentrically_braced_frame: {
            R: 6,
            Omega0: 2,
            Cd: 5,
            heightLimit: 160,
          },
          ordinary_concentrically_braced_frame: {
            R: 3.25,
            Omega0: 2,
            Cd: 3.25,
            heightLimit: 35,
          },
        },
        concreteSystems: {
          special_moment_frame: {
            R: 8,
            Omega0: 3,
            Cd: 5.5,
            heightLimit: "NL",
          },
          intermediate_moment_frame: {
            R: 5,
            Omega0: 3,
            Cd: 4.5,
            heightLimit: "NL",
          },
          ordinary_moment_frame: {
            R: 3,
            Omega0: 3,
            Cd: 2.5,
            heightLimit: "NP",
          },
        },
      },
      applicability: [
        "R = Response modification coefficient",
        "Ω0 = Overstrength factor",
        "Cd = Deflection amplification factor",
        "NL = Not Limited, NP = Not Permitted in SDC D, E, F",
      ],
    });
  }

  private initializeEquations(): void {
    // Equation 12.8-1: Seismic Base Shear
    this.equations.set("12.8-1", {
      title: "Seismic Base Shear",
      source: "ASCE 7-16 Equation 12.8-1",
      equation: "V = CsW",
      variables: {
        V: "Seismic base shear (kips or kN)",
        Cs: "Seismic response coefficient",
        W: "Effective seismic weight (kips or kN)",
      },
      note: "Equivalent lateral force procedure",
      applicability: [
        "Buildings meeting requirements of Section 12.6",
        "Regular structures in SDC B, C, D",
      ],
    });

    // Equation 12.8-2: Seismic Response Coefficient
    this.equations.set("12.8-2", {
      title: "Seismic Response Coefficient",
      source: "ASCE 7-16 Equation 12.8-2",
      equation: "Cs = SDS/(R/I)",
      variables: {
        Cs: "Seismic response coefficient",
        SDS: "Design spectral response acceleration parameter at short periods",
        R: "Response modification coefficient",
        I: "Importance factor",
      },
      note: "Subject to upper and lower limits per Section 12.8.1.1",
      limits: {
        maximum: "Cs need not exceed SD1/(T(R/I)) for T ≤ TL",
        minimum: "Cs shall not be less than 0.044SDSI ≥ 0.01",
      },
      applicability: [
        "All structures using equivalent lateral force procedure",
      ],
    });

    // Equation 11.4-1: Design Response Spectrum
    this.equations.set("11.4-1", {
      title: "Design Response Spectrum - SMS",
      source: "ASCE 7-16 Equation 11.4-1",
      equation: "SMS = FaSs",
      variables: {
        SMS: "Site-modified spectral acceleration for short periods",
        Fa: "Site coefficient for short periods",
        Ss: "Mapped MCER spectral response acceleration for short periods",
      },
      note: "Site-modified spectral acceleration parameter",
      applicability: ["All structures requiring seismic design"],
    });

    // Equation 11.4-2: Design Response Spectrum - SM1
    this.equations.set("11.4-2", {
      title: "Design Response Spectrum - SM1",
      source: "ASCE 7-16 Equation 11.4-2",
      equation: "SM1 = FvS1",
      variables: {
        SM1: "Site-modified spectral acceleration for 1-second periods",
        Fv: "Site coefficient for 1-second periods",
        S1: "Mapped MCER spectral response acceleration for 1-second periods",
      },
      note: "Site-modified spectral acceleration parameter",
      applicability: ["All structures requiring seismic design"],
    });
  }

  private initializeLimits(): void {
    // Seismic Design Category Limits
    this.limits.set("sdc-limits", {
      title: "Seismic Design Category Limitations",
      source: "ASCE 7-16 Section 12.2",
      limits: {
        sdcA: {
          requirements: "Minimal seismic design requirements",
          note: "SDS < 0.167g and SD1 < 0.067g",
        },
        sdcB: {
          requirements: "Basic seismic design requirements",
          note: "0.167g ≤ SDS < 0.33g and 0.067g ≤ SD1 < 0.133g",
        },
        sdcC: {
          requirements: "Intermediate seismic design requirements",
          note: "0.33g ≤ SDS < 0.50g and 0.133g ≤ SD1 < 0.20g",
        },
        sdcD_E_F: {
          requirements: "High seismic design requirements",
          note: "SDS ≥ 0.50g or SD1 ≥ 0.20g",
        },
      },
    });

    // Height Limits
    this.limits.set("height-limits", {
      title: "Structural System Height Limits",
      source: "ASCE 7-16 Table 12.2-1",
      limits: {
        specialMomentFrame: {
          value: "NL",
          note: "No limit for special moment frames",
        },
        intermediateMomentFrame: {
          value: 35,
          unit: "ft",
          note: "Height limit for intermediate moment frames in SDC D, E, F",
        },
        ordinaryMomentFrame: {
          value: "NP",
          note: "Not permitted in SDC D, E, F",
        },
        bracedFrame: {
          value: 160,
          unit: "ft",
          note: "Height limit for special concentrically braced frames",
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
            source: "Seismic Code Data",
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        source: "Seismic Code Data",
      };
    }
  }

  private getTable(reference: string): CodeEngineResponse {
    const table = this.tables.get(reference);
    if (!table) {
      return {
        success: false,
        error: `Table ${reference} not found`,
        source: "Seismic Code Data",
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
        source: "Seismic Code Data",
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
        source: "Seismic Code Data",
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
      source: "Seismic Code Data",
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
