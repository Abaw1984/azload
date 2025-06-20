import { CodeEngineQuery, CodeEngineResponse } from "../index";

// ASCE 7-16 Figures Data Module
export class FigureData {
  private figures: Map<string, any> = new Map();
  private diagrams: Map<string, any> = new Map();
  private charts: Map<string, any> = new Map();

  constructor() {
    this.initializeFigures();
    this.initializeDiagrams();
    this.initializeCharts();
  }

  private initializeFigures(): void {
    // Wind Load Figures
    this.figures.set("27.3-1", {
      title: "Basic Wind Speed Map",
      chapter: "27",
      description: "Basic wind speeds for the United States",
      type: "map",
      data: {
        contours: [
          { speed: 85, regions: ["Interior Alaska"] },
          { speed: 90, regions: ["Most of continental US"] },
          { speed: 100, regions: ["Coastal areas"] },
          { speed: 110, regions: ["Hurricane-prone regions"] },
          { speed: 120, regions: ["South Florida, Hawaii"] },
          { speed: 130, regions: ["Extreme coastal areas"] },
          { speed: 140, regions: ["Special wind regions"] },
        ],
        units: "mph (3-second gust)",
        elevation: "33 ft (10 m) above ground",
      },
      notes: [
        "Values are 3-second gust speeds",
        "At 33 ft (10 m) above ground in Exposure Category C",
        "For Risk Category II buildings and other structures",
      ],
      applicability: "All wind load calculations",
    });

    this.figures.set("27.3-8", {
      title: "Topographic Factor Map",
      chapter: "27",
      description: "Topographic effects on wind speed",
      type: "diagram",
      data: {
        factors: [
          { terrain: "Flat terrain", factor: 1.0 },
          { terrain: "Hills and ridges", factor: "1.0 to 1.3" },
          { terrain: "Escarpments", factor: "1.0 to 1.2" },
        ],
        parameters: {
          H: "Height of hill, ridge, or escarpment",
          Lh: "Distance upwind to where ground elevation is half the height",
          x: "Distance from crest to building site",
        },
      },
      notes: [
        "Apply only when specific geometric criteria are met",
        "H/Lh ≥ 0.2 for hills and ridges",
        "H/Lh ≥ 0.3 for escarpments",
      ],
      applicability: "Buildings on or near topographic features",
    });

    // Seismic Load Figures
    this.figures.set("22-1", {
      title: "Maximum Considered Earthquake Ground Motion Maps",
      chapter: "22",
      description: "Seismic ground motion parameters for the United States",
      type: "map",
      data: {
        parameters: [
          {
            name: "Ss",
            description: "Mapped spectral acceleration (short periods)",
          },
          {
            name: "S1",
            description: "Mapped spectral acceleration (1-second period)",
          },
        ],
        contours: [
          { value: "0.25g", regions: ["Low seismic areas"] },
          { value: "0.50g", regions: ["Moderate seismic areas"] },
          { value: "0.75g", regions: ["High seismic areas"] },
          { value: "1.00g", regions: ["Very high seismic areas"] },
          { value: "1.50g+", regions: ["Extreme seismic areas"] },
        ],
      },
      notes: [
        "Values are for Site Class B (rock)",
        "Risk-targeted maximum considered earthquake",
        "2% probability of exceedance in 50 years",
      ],
      applicability: "All seismic design",
    });

    // Snow Load Figures
    this.figures.set("7-1", {
      title: "Ground Snow Loads for the United States",
      chapter: "7",
      description: "Ground snow load map",
      type: "map",
      data: {
        contours: [
          { load: 0, regions: ["Southern states"] },
          { load: 10, regions: ["Mild climate zones"] },
          { load: 20, regions: ["Moderate climate zones"] },
          { load: 30, regions: ["Cold climate zones"] },
          { load: 40, regions: ["Very cold climate zones"] },
          { load: 50, regions: ["Extreme cold zones"] },
          { load: "70+", regions: ["Mountain regions"] },
        ],
        units: "psf (kN/m²)",
      },
      notes: [
        "50-year mean recurrence interval",
        "Values in pounds per square foot",
        "Site-specific studies required in some areas",
      ],
      applicability: "All snow load calculations",
    });

    // Live Load Figures
    this.figures.set("4-1", {
      title: "Influence Area Diagram",
      chapter: "4",
      description: "Tributary areas for live load reduction",
      type: "diagram",
      data: {
        elements: [
          { type: "Interior column", area: "4 × tributary area" },
          { type: "Exterior column", area: "2 × tributary area" },
          { type: "Corner column", area: "1 × tributary area" },
          { type: "Interior beam", area: "2 × tributary area" },
          { type: "Exterior beam", area: "1 × tributary area" },
        ],
        formula: "L = Lo × (0.25 + 15/√AI)",
        variables: {
          L: "Reduced live load (psf)",
          Lo: "Unreduced live load (psf)",
          AI: "Influence area (ft²)",
        },
      },
      notes: [
        "Live load reduction applies when AI ≥ 400 ft²",
        "Reduced live load shall not be less than 0.5Lo",
        "Some occupancies have restrictions on reduction",
      ],
      applicability: "Live load reduction calculations",
    });
  }

  private initializeDiagrams(): void {
    // Wind pressure diagrams
    this.diagrams.set("wind-pressure-zones", {
      title: "Wind Pressure Zones for Buildings",
      description: "Pressure coefficient zones for rectangular buildings",
      type: "building_diagram",
      data: {
        zones: [
          { zone: "A", location: "End zones", cp: "-0.9 to +0.8" },
          { zone: "B", location: "Interior zones", cp: "-0.7 to +0.8" },
          { zone: "C", location: "Corner zones", cp: "-1.5 to +0.8" },
          { zone: "D", location: "Edge zones", cp: "-1.0 to +0.8" },
        ],
        parameters: {
          a: "10% of least horizontal dimension or 0.4h, whichever is smaller, but not less than 4% of least horizontal dimension or 3 ft",
          h: "Mean roof height",
        },
      },
      applicability: "Directional procedure wind loads",
    });

    // Seismic force distribution
    this.diagrams.set("seismic-force-distribution", {
      title: "Vertical Distribution of Seismic Forces",
      description:
        "Distribution of lateral seismic forces over building height",
      type: "force_diagram",
      data: {
        distribution: "Fx = Cvx × V",
        formula: "Cvx = (wx × hx^k) / Σ(wi × hi^k)",
        variables: {
          Fx: "Lateral force at level x",
          Cvx: "Vertical distribution factor",
          V: "Total design lateral force",
          wx: "Weight at level x",
          hx: "Height at level x",
          k: "Exponent (1.0 for T ≤ 0.5s, 2.0 for T ≥ 2.5s)",
        },
      },
      applicability: "Equivalent lateral force procedure",
    });

    // Snow drift diagrams
    this.diagrams.set("snow-drift", {
      title: "Snow Drift Configurations",
      description: "Typical snow drift patterns on roofs",
      type: "roof_diagram",
      data: {
        configurations: [
          {
            type: "Windward drift",
            location: "Lower roof adjacent to higher roof",
          },
          {
            type: "Leeward drift",
            location: "Higher roof adjacent to lower roof",
          },
          { type: "Valley drift", location: "Roof valleys and corners" },
        ],
        formula: "pd = 0.43 × (pg + 10)^(1/3) × (S + 10 - W)^(1/3)",
        variables: {
          pd: "Drift surcharge load (psf)",
          pg: "Ground snow load (psf)",
          S: "Horizontal distance (ft)",
          W: "Width of drift (ft)",
        },
      },
      applicability: "Roof snow load calculations",
    });
  }

  private initializeCharts(): void {
    // Response modification factors
    this.charts.set("seismic-R-factors", {
      title: "Response Modification Factors (R)",
      description: "Seismic response modification factors by structural system",
      type: "table_chart",
      data: {
        systems: [
          { system: "Special moment frame (steel)", R: 8, Ωo: 3, Cd: 5.5 },
          { system: "Special moment frame (concrete)", R: 8, Ωo: 3, Cd: 5.5 },
          { system: "Special concentrically braced frame", R: 6, Ωo: 2, Cd: 5 },
          { system: "Eccentrically braced frame", R: 8, Ωo: 2, Cd: 4 },
          { system: "Special shear wall (concrete)", R: 5, Ωo: 2.5, Cd: 5 },
          { system: "Special shear wall (masonry)", R: 5, Ωo: 2.5, Cd: 3.5 },
        ],
        parameters: {
          R: "Response modification factor",
          Ωo: "Overstrength factor",
          Cd: "Deflection amplification factor",
        },
      },
      applicability: "Seismic design of buildings",
    });

    // Wind exposure categories
    this.charts.set("wind-exposure", {
      title: "Wind Exposure Categories",
      description: "Surface roughness categories for wind load calculations",
      type: "classification_chart",
      data: {
        categories: [
          {
            category: "B",
            description: "Urban and suburban areas, wooded areas",
            roughness: "High",
            αz: 7.0,
            zg: 1200,
          },
          {
            category: "C",
            description: "Open terrain with scattered obstructions",
            roughness: "Medium",
            αz: 9.5,
            zg: 900,
          },
          {
            category: "D",
            description: "Flat, unobstructed areas, water surfaces",
            roughness: "Low",
            αz: 11.5,
            zg: 700,
          },
        ],
        parameters: {
          αz: "Power law exponent",
          zg: "Gradient height (ft)",
        },
      },
      applicability: "Wind speed profile determination",
    });
  }

  // Main query method
  query(request: CodeEngineQuery): CodeEngineResponse {
    try {
      console.log("📊 Figures Data Query:", request);

      switch (request.type) {
        case "figure":
          return this.getFigure(request.reference);
        case "table":
          return this.getChart(request.reference);
        default:
          // Try to find in any collection
          return this.searchAllCollections(request.reference);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        source: "ASCE 7-16 Figures Database",
      };
    }
  }

  private getFigure(reference: string): CodeEngineResponse {
    const figure = this.figures.get(reference);
    if (!figure) {
      return {
        success: false,
        error: `Figure ${reference} not found`,
        source: "ASCE 7-16 Figures Database",
      };
    }

    return {
      success: true,
      data: figure,
      source: `ASCE 7-16 Figure ${reference}`,
      note: "Figure data from ASCE 7-16 standard",
    };
  }

  private getDiagram(reference: string): CodeEngineResponse {
    const diagram = this.diagrams.get(reference);
    if (!diagram) {
      return {
        success: false,
        error: `Diagram ${reference} not found`,
        source: "ASCE 7-16 Figures Database",
      };
    }

    return {
      success: true,
      data: diagram,
      source: `ASCE 7-16 Diagram ${reference}`,
      note: "Diagram from ASCE 7-16 standard",
    };
  }

  private getChart(reference: string): CodeEngineResponse {
    const chart = this.charts.get(reference);
    if (!chart) {
      return {
        success: false,
        error: `Chart ${reference} not found`,
        source: "ASCE 7-16 Figures Database",
      };
    }

    return {
      success: true,
      data: chart,
      source: `ASCE 7-16 Chart ${reference}`,
      note: "Chart data from ASCE 7-16 standard",
    };
  }

  private searchAllCollections(reference: string): CodeEngineResponse {
    // Search figures first
    if (this.figures.has(reference)) {
      return this.getFigure(reference);
    }

    // Search diagrams
    if (this.diagrams.has(reference)) {
      return this.getDiagram(reference);
    }

    // Search charts
    if (this.charts.has(reference)) {
      return this.getChart(reference);
    }

    return {
      success: false,
      error: `Reference ${reference} not found in figures database`,
      source: "ASCE 7-16 Figures Database",
      note: "Available collections: figures, diagrams, charts",
    };
  }

  // Export all figure data
  exportData(): any {
    return {
      figures: Object.fromEntries(this.figures),
      diagrams: Object.fromEntries(this.diagrams),
      charts: Object.fromEntries(this.charts),
      metadata: {
        totalFigures: this.figures.size,
        totalDiagrams: this.diagrams.size,
        totalCharts: this.charts.size,
        categories: ["Wind", "Seismic", "Snow", "Live", "Dead", "Crane"],
      },
    };
  }

  // Get available references
  getAvailableReferences(): {
    figures: string[];
    diagrams: string[];
    charts: string[];
  } {
    return {
      figures: Array.from(this.figures.keys()),
      diagrams: Array.from(this.diagrams.keys()),
      charts: Array.from(this.charts.keys()),
    };
  }

  // Search by chapter
  getByChapter(chapter: string): CodeEngineResponse {
    const chapterFigures = Array.from(this.figures.entries())
      .filter(([_, figure]) => figure.chapter === chapter)
      .map(([ref, figure]) => ({ reference: ref, ...figure }));

    if (chapterFigures.length === 0) {
      return {
        success: false,
        error: `No figures found for chapter ${chapter}`,
        source: "ASCE 7-16 Figures Database",
      };
    }

    return {
      success: true,
      data: {
        chapter,
        figures: chapterFigures,
        count: chapterFigures.length,
      },
      source: `ASCE 7-16 Chapter ${chapter} Figures`,
      note: `Found ${chapterFigures.length} figures for chapter ${chapter}`,
    };
  }

  // Search by type
  getByType(type: string): CodeEngineResponse {
    const typeFigures = Array.from(this.figures.entries())
      .filter(([_, figure]) => figure.type === type)
      .map(([ref, figure]) => ({ reference: ref, ...figure }));

    if (typeFigures.length === 0) {
      return {
        success: false,
        error: `No figures found for type ${type}`,
        source: "ASCE 7-16 Figures Database",
      };
    }

    return {
      success: true,
      data: {
        type,
        figures: typeFigures,
        count: typeFigures.length,
      },
      source: `ASCE 7-16 ${type} Figures`,
      note: `Found ${typeFigures.length} figures of type ${type}`,
    };
  }
}
