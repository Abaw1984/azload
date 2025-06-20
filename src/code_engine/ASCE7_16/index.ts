import { MasterControlPoint, LoadType } from "@/types/model";
import { WindCodeData } from "./chapters/wind";
import { SeismicCodeData } from "./chapters/seismic";
import { SnowCodeData } from "./chapters/snow";
import { LiveCodeData } from "./chapters/live";
import { DeadCodeData } from "./chapters/dead";
import { CraneCodeData } from "./chapters/crane";
import { FigureData } from "./figures";

// Master ASCE 7-16 Code Engine Interface
export interface CodeEngineQuery {
  type: "table" | "figure" | "equation" | "limit" | "text";
  chapter: string;
  section?: string;
  reference: string;
  geometry?: {
    buildingType: string;
    heightClassification: string;
    structuralRigidity: string;
    unitsSystem: string;
    dimensions: {
      buildingLength: number;
      buildingWidth: number;
      totalHeight: number;
      roofSlope: number;
    };
  };
  otherParameters?: Record<string, any>;
}

export interface CodeEngineResponse {
  success: boolean;
  data?: any;
  source: string;
  note?: string;
  applicabilityLimits?: string[];
  relatedReferences?: string[];
  error?: string;
}

// Main ASCE 7-16 Code Engine Class
export class ASCE716CodeEngine {
  private static instance: ASCE716CodeEngine;
  private windData: WindCodeData;
  private seismicData: SeismicCodeData;
  private snowData: SnowCodeData;
  private liveData: LiveCodeData;
  private deadData: DeadCodeData;
  private craneData: CraneCodeData;
  private figureData: FigureData;

  private constructor() {
    this.windData = new WindCodeData();
    this.seismicData = new SeismicCodeData();
    this.snowData = new SnowCodeData();
    this.liveData = new LiveCodeData();
    this.deadData = new DeadCodeData();
    this.craneData = new CraneCodeData();
    this.figureData = new FigureData();
  }

  static getInstance(): ASCE716CodeEngine {
    if (!ASCE716CodeEngine.instance) {
      ASCE716CodeEngine.instance = new ASCE716CodeEngine();
    }
    return ASCE716CodeEngine.instance;
  }

  // Master Query Method - Single Entry Point for All Code Data
  query(request: CodeEngineQuery): CodeEngineResponse {
    try {
      console.log("🔍 ASCE 7-16 Code Engine Query:", request);

      // Route to appropriate chapter based on load type or chapter
      switch (request.chapter.toLowerCase()) {
        case "wind":
        case "27":
        case "28":
        case "29":
        case "30":
          return this.windData.query(request);

        case "seismic":
        case "11":
        case "12":
        case "13":
        case "14":
        case "15":
        case "16":
          return this.seismicData.query(request);

        case "snow":
        case "7":
          return this.snowData.query(request);

        case "live":
        case "4":
          return this.liveData.query(request);

        case "dead":
        case "3":
          return this.deadData.query(request);

        case "crane":
        case "4.9":
          return this.craneData.query(request);

        case "figures":
          return this.figureData.query(request);

        default:
          return {
            success: false,
            error: `Unknown chapter: ${request.chapter}`,
            source: "ASCE 7-16 Code Engine",
            note: "Supported chapters: wind (27-30), seismic (11-16), snow (7), live (4), dead (3), crane (4.9)",
          };
      }
    } catch (error) {
      console.error("❌ Code Engine Query Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        source: "ASCE 7-16 Code Engine",
      };
    }
  }

  // Convenience Methods for Load Tabs
  getWindData(mcp: MasterControlPoint, reference: string): CodeEngineResponse {
    return this.query({
      type: "table",
      chapter: "wind",
      reference,
      geometry: {
        buildingType: mcp.buildingType,
        heightClassification: mcp.heightClassification,
        structuralRigidity: mcp.structuralRigidity,
        unitsSystem: mcp.unitsSystem,
        dimensions: mcp.dimensions,
      },
    });
  }

  getSeismicData(
    mcp: MasterControlPoint,
    reference: string,
  ): CodeEngineResponse {
    return this.query({
      type: "table",
      chapter: "seismic",
      reference,
      geometry: {
        buildingType: mcp.buildingType,
        heightClassification: mcp.heightClassification,
        structuralRigidity: mcp.structuralRigidity,
        unitsSystem: mcp.unitsSystem,
        dimensions: mcp.dimensions,
      },
    });
  }

  getSnowData(mcp: MasterControlPoint, reference: string): CodeEngineResponse {
    return this.query({
      type: "table",
      chapter: "snow",
      reference,
      geometry: {
        buildingType: mcp.buildingType,
        heightClassification: mcp.heightClassification,
        structuralRigidity: mcp.structuralRigidity,
        unitsSystem: mcp.unitsSystem,
        dimensions: mcp.dimensions,
      },
    });
  }

  // Get all applicable code references for a building type
  getApplicableReferences(
    mcp: MasterControlPoint,
    loadType: LoadType,
  ): string[] {
    const references: string[] = [];

    switch (loadType) {
      case "WIND":
        references.push("27.3-1", "28.3-1", "29.3-1", "30.3-1");
        if (mcp.heightClassification === "HIGH_RISE") {
          references.push("27.4-1", "27.4-2");
        }
        break;

      case "SEISMIC":
        references.push("12.8-1", "12.8-2", "11.4-1", "11.4-2");
        if (mcp.structuralRigidity === "FLEXIBLE") {
          references.push("12.9-1", "12.9-2");
        }
        break;

      case "SNOW":
        references.push("7.3-1", "7.4-1");
        if (mcp.roofType === "GABLE") {
          references.push("7.4-2", "7.4-3");
        }
        break;

      case "LIVE":
        references.push("4.3-1", "4.7-1");
        break;

      case "DEAD":
        references.push("3.1-1", "3.2-1");
        break;

      case "CRANE":
        references.push("4.9-1", "4.9-2");
        break;
    }

    return references;
  }

  // Validate MCP against code requirements
  validateMCPCompliance(mcp: MasterControlPoint): {
    isCompliant: boolean;
    violations: string[];
    warnings: string[];
    applicableCodes: string[];
  } {
    const violations: string[] = [];
    const warnings: string[] = [];
    const applicableCodes: string[] = [];

    // Height classification validation
    if (
      mcp.dimensions.totalHeight > 18.3 &&
      mcp.heightClassification !== "HIGH_RISE"
    ) {
      violations.push(
        "Building height > 60ft (18.3m) requires HIGH_RISE classification per ASCE 7-16",
      );
    }

    // Structural rigidity validation
    const aspectRatio =
      mcp.dimensions.totalHeight /
      Math.min(mcp.dimensions.buildingLength, mcp.dimensions.buildingWidth);
    if (aspectRatio > 5 && mcp.structuralRigidity !== "FLEXIBLE") {
      warnings.push(
        "High aspect ratio structures typically require FLEXIBLE classification",
      );
    }

    // Building type specific validations
    switch (mcp.buildingType) {
      case "SINGLE_GABLE_HANGAR":
      case "MULTI_GABLE_HANGAR":
        applicableCodes.push(
          "ASCE 7-16 Ch. 27-30 (Wind)",
          "ASCE 7-16 Ch. 11-16 (Seismic)",
        );
        if (mcp.dimensions.buildingWidth < 15) {
          warnings.push("Hangar structures typically have minimum 15m width");
        }
        break;

      case "SIGNAGE_BILLBOARD":
        applicableCodes.push("ASCE 7-16 Ch. 29 (Other Structures)");
        if (mcp.roofType !== "FLAT") {
          violations.push("Signage structures should not have sloped roofs");
        }
        break;
    }

    return {
      isCompliant: violations.length === 0,
      violations,
      warnings,
      applicableCodes,
    };
  }

  // Export all code data for external use (ML training, etc.)
  exportCodeData(): {
    wind: any;
    seismic: any;
    snow: any;
    live: any;
    dead: any;
    crane: any;
    figures: any;
    metadata: {
      version: string;
      lastUpdated: string;
      totalTables: number;
      totalFigures: number;
      totalEquations: number;
    };
  } {
    return {
      wind: this.windData.exportData(),
      seismic: this.seismicData.exportData(),
      snow: this.snowData.exportData(),
      live: this.liveData.exportData(),
      dead: this.deadData.exportData(),
      crane: this.craneData.exportData(),
      figures: this.figureData.exportData(),
      metadata: {
        version: "ASCE 7-16",
        lastUpdated: new Date().toISOString(),
        totalTables: 150, // Approximate
        totalFigures: 75, // Approximate
        totalEquations: 200, // Approximate
      },
    };
  }
}

// Export singleton instance
export const CodeEngine = ASCE716CodeEngine.getInstance();

// Export types for use in Load Tabs
export type { CodeEngineQuery, CodeEngineResponse };
