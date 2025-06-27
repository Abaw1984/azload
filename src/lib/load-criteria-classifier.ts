import { StructuralModel } from "@/types/model";
import type { Database } from "@/types/supabase";

// ASCE 7-16 Load Criteria Classification Types
export interface LoadCriteriaClassification {
  buildingHeightCategory: "LOW_RISE" | "MID_RISE" | "HIGH_RISE";
  exposureCategory: "A" | "B" | "C" | "D";
  enclosureClassification: "ENCLOSED" | "PARTIALLY_ENCLOSED" | "OPEN";
  roofType:
    | "FLAT"
    | "GABLE"
    | "HIP"
    | "SHED"
    | "GAMBREL"
    | "MANSARD"
    | "MONO_SLOPE"
    | "ARCH";
  confidence: {
    heightCategory: number;
    exposureCategory: number;
    enclosureClassification: number;
    roofType: number;
  };
  asce716References: {
    heightCategory: string;
    exposureCategory: string;
    enclosureClassification: string;
    roofType: string;
  };
  geometryAnalysis: {
    meanRoofHeight: number;
    eaveHeight: number;
    buildingLength: number;
    buildingWidth: number;
    roofSlope: number;
    aspectRatio: number;
    volumeToSurfaceRatio: number;
  };
}

export interface LoadCriteriaRequest {
  model: StructuralModel;
  projectId?: string;
  userId?: string;
  analysisType:
    | "complete"
    | "height_only"
    | "exposure_only"
    | "enclosure_only"
    | "roof_only";
}

export interface LoadCriteriaResponse {
  success: boolean;
  classification: LoadCriteriaClassification;
  processingTime: number;
  apiVersion: string;
  timestamp: string;
  error?: string;
}

/**
 * ASCE 7-16 Load Criteria Classifier
 * Integrates with ML API to classify building load criteria according to ASCE 7-16 standards
 */
export class LoadCriteriaClassifier {
  private static readonly ML_API_ENDPOINT =
    import.meta.env.VITE_ML_API_URL || "http://178.128.135.194";
  private static readonly ML_API_ENABLED =
    import.meta.env.VITE_ML_API_ENABLED === "true";

  /**
   * Classify load criteria for a structural model using ML API
   */
  static async classifyLoadCriteria(
    model: StructuralModel,
    options: {
      projectId?: string;
      userId?: string;
      analysisType?:
        | "complete"
        | "height_only"
        | "exposure_only"
        | "enclosure_only"
        | "roof_only";
    } = {},
  ): Promise<LoadCriteriaResponse> {
    const startTime = Date.now();

    console.log(
      "🏗️ LOAD CRITERIA CLASSIFICATION: Starting ASCE 7-16 analysis...",
      {
        modelId: model.id,
        modelName: model.name,
        analysisType: options.analysisType || "complete",
        apiEndpoint: this.ML_API_ENDPOINT,
        timestamp: new Date().toISOString(),
      },
    );

    try {
      // Prepare geometry data for classification
      const geometryData = this.extractGeometryForClassification(model);

      console.log("📐 GEOMETRY EXTRACTION:", geometryData);

      const request: LoadCriteriaRequest = {
        model: model,
        projectId: options.projectId,
        userId: options.userId,
        analysisType: options.analysisType || "complete",
      };

      // Call ML API for load criteria classification
      const response = await fetch(
        `${this.ML_API_ENDPOINT}/classify-load-criteria`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Analysis-Type": request.analysisType,
            "X-ASCE-Version": "7-16",
            "X-Request-ID": crypto.randomUUID(),
          },
          body: JSON.stringify({
            ...request,
            geometryData,
            timestamp: new Date().toISOString(),
            asce716_compliance: true,
          }),
        },
      );

      const processingTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(
          `ML API Error: ${response.status} - ${response.statusText}`,
        );
      }

      const result = await response.json();

      console.log("✅ LOAD CRITERIA CLASSIFICATION COMPLETE:", {
        processingTime,
        classification: result.classification,
        confidence: result.classification?.confidence,
      });

      return {
        success: true,
        classification: result.classification,
        processingTime,
        apiVersion: result.apiVersion || "1.0.0",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ LOAD CRITERIA CLASSIFICATION FAILED:", error);

      // Fallback to local classification if ML API is unavailable
      const fallbackClassification = this.fallbackClassification(model);
      const processingTime = Date.now() - startTime;

      console.log("🔄 USING FALLBACK CLASSIFICATION:", fallbackClassification);

      return {
        success: false,
        classification: fallbackClassification,
        processingTime,
        apiVersion: "fallback-1.0.0",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Extract geometry data needed for load criteria classification
   */
  private static extractGeometryForClassification(model: StructuralModel) {
    const geometry = model.geometry;
    const nodes = model.nodes || [];
    const members = model.members || [];

    // Calculate building dimensions from nodes if geometry is incomplete
    let buildingDimensions = {
      length: geometry?.buildingLength || 0,
      width: geometry?.buildingWidth || 0,
      height: geometry?.totalHeight || geometry?.eaveHeight || 0,
      eaveHeight: geometry?.eaveHeight || 0,
      meanRoofHeight: geometry?.meanRoofHeight || geometry?.totalHeight || 0,
    };

    if (
      nodes.length > 0 &&
      (buildingDimensions.length === 0 || buildingDimensions.width === 0)
    ) {
      const xCoords = nodes.map((n) => n.x);
      const yCoords = nodes.map((n) => n.y);
      const zCoords = nodes.map((n) => n.z);

      buildingDimensions = {
        length: Math.max(...zCoords) - Math.min(...zCoords),
        width: Math.max(...xCoords) - Math.min(...xCoords),
        height: Math.max(...yCoords) - Math.min(...yCoords),
        eaveHeight: (Math.max(...yCoords) - Math.min(...yCoords)) * 0.8, // Estimate
        meanRoofHeight: Math.max(...yCoords) - Math.min(...yCoords),
      };
    }

    // Calculate additional geometric properties
    const aspectRatio =
      buildingDimensions.length > 0
        ? buildingDimensions.width / buildingDimensions.length
        : 1;
    const footprintArea = buildingDimensions.length * buildingDimensions.width;
    const volume = footprintArea * buildingDimensions.height;
    const surfaceArea =
      2 * (buildingDimensions.length * buildingDimensions.width) +
      2 * (buildingDimensions.length * buildingDimensions.height) +
      2 * (buildingDimensions.width * buildingDimensions.height);
    const volumeToSurfaceRatio = surfaceArea > 0 ? volume / surfaceArea : 0;

    return {
      ...buildingDimensions,
      aspectRatio,
      footprintArea,
      volume,
      surfaceArea,
      volumeToSurfaceRatio,
      roofSlope: geometry?.roofSlope || 0,
      nodeCount: nodes.length,
      memberCount: members.length,
      unitsSystem: model.unitsSystem,
      buildingType: model.geometry?.buildingType || "UNKNOWN",
    };
  }

  /**
   * Fallback classification using ASCE 7-16 rules when ML API is unavailable
   */
  private static fallbackClassification(
    model: StructuralModel,
  ): LoadCriteriaClassification {
    const geometryData = this.extractGeometryForClassification(model);

    console.log(
      "🔄 FALLBACK CLASSIFICATION: Using ASCE 7-16 rules...",
      geometryData,
    );

    // Height Category Classification (ASCE 7-16 Table 26.2-1)
    let heightCategory: "LOW_RISE" | "MID_RISE" | "HIGH_RISE" = "LOW_RISE";
    const meanRoofHeight = geometryData.meanRoofHeight;

    if (meanRoofHeight <= 60) {
      // 60 feet or equivalent
      heightCategory = "LOW_RISE";
    } else if (meanRoofHeight <= 160) {
      // 160 feet or equivalent
      heightCategory = "MID_RISE";
    } else {
      heightCategory = "HIGH_RISE";
    }

    // Exposure Category (ASCE 7-16 Section 26.7) - Default to C for most structures
    const exposureCategory: "A" | "B" | "C" | "D" = "C";

    // Enclosure Classification (ASCE 7-16 Section 26.2) - Default to ENCLOSED
    const enclosureClassification: "ENCLOSED" | "PARTIALLY_ENCLOSED" | "OPEN" =
      "ENCLOSED";

    // Roof Type Classification based on geometry
    let roofType:
      | "FLAT"
      | "GABLE"
      | "HIP"
      | "SHED"
      | "GAMBREL"
      | "MANSARD"
      | "MONO_SLOPE"
      | "ARCH" = "GABLE";

    if (geometryData.roofSlope === 0) {
      roofType = "FLAT";
    } else if (geometryData.roofSlope > 0 && geometryData.roofSlope <= 15) {
      roofType = "GABLE";
    } else if (geometryData.roofSlope > 15) {
      roofType = "SHED";
    }

    return {
      buildingHeightCategory: heightCategory,
      exposureCategory,
      enclosureClassification,
      roofType,
      confidence: {
        heightCategory: 0.9, // High confidence for rule-based height classification
        exposureCategory: 0.6, // Lower confidence for default exposure
        enclosureClassification: 0.7, // Medium confidence for default enclosure
        roofType: geometryData.roofSlope !== undefined ? 0.8 : 0.5,
      },
      asce716References: {
        heightCategory: "ASCE 7-16 Table 26.2-1",
        exposureCategory: "ASCE 7-16 Section 26.7",
        enclosureClassification: "ASCE 7-16 Section 26.2",
        roofType: "ASCE 7-16 Chapter 26",
      },
      geometryAnalysis: {
        meanRoofHeight: geometryData.meanRoofHeight,
        eaveHeight: geometryData.eaveHeight,
        buildingLength: geometryData.length,
        buildingWidth: geometryData.width,
        roofSlope: geometryData.roofSlope,
        aspectRatio: geometryData.aspectRatio,
        volumeToSurfaceRatio: geometryData.volumeToSurfaceRatio,
      },
    };
  }

  /**
   * Save load criteria classification results to Supabase
   */
  static async saveClassificationResults(
    projectId: string,
    classification: LoadCriteriaClassification,
    supabaseClient: any,
  ): Promise<void> {
    try {
      console.log("💾 SAVING LOAD CRITERIA RESULTS:", {
        projectId,
        classification,
      });

      // Update projects table with classification results
      const { error } = await supabaseClient
        .from("projects")
        .update({
          height_category: classification.buildingHeightCategory,
          exposure_category: classification.exposureCategory,
          enclosure_classification: classification.enclosureClassification,
          roof_type: classification.roofType,
          geometry_summary: {
            ...classification.geometryAnalysis,
            loadCriteriaClassification: {
              ...classification,
              timestamp: new Date().toISOString(),
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", projectId);

      if (error) {
        throw error;
      }

      console.log("✅ LOAD CRITERIA RESULTS SAVED TO DATABASE");
    } catch (error) {
      console.error("❌ FAILED TO SAVE LOAD CRITERIA RESULTS:", error);
      throw error;
    }
  }

  /**
   * Get load criteria classification from database
   */
  static async getClassificationResults(
    projectId: string,
    supabaseClient: any,
  ): Promise<LoadCriteriaClassification | null> {
    try {
      const { data, error } = await supabaseClient
        .from("projects")
        .select(
          "height_category, exposure_category, enclosure_classification, roof_type, geometry_summary",
        )
        .eq("project_id", projectId)
        .single();

      if (error || !data) {
        return null;
      }

      // Check if we have stored classification data
      const storedClassification =
        data.geometry_summary?.loadCriteriaClassification;
      if (storedClassification) {
        return storedClassification;
      }

      // Build classification from individual fields if available
      if (
        data.height_category ||
        data.exposure_category ||
        data.enclosure_classification ||
        data.roof_type
      ) {
        return {
          buildingHeightCategory: data.height_category || "LOW_RISE",
          exposureCategory: data.exposure_category || "C",
          enclosureClassification: data.enclosure_classification || "ENCLOSED",
          roofType: data.roof_type || "GABLE",
          confidence: {
            heightCategory: 0.8,
            exposureCategory: 0.8,
            enclosureClassification: 0.8,
            roofType: 0.8,
          },
          asce716References: {
            heightCategory: "ASCE 7-16 Table 26.2-1",
            exposureCategory: "ASCE 7-16 Section 26.7",
            enclosureClassification: "ASCE 7-16 Section 26.2",
            roofType: "ASCE 7-16 Chapter 26",
          },
          geometryAnalysis: data.geometry_summary || {
            meanRoofHeight: 0,
            eaveHeight: 0,
            buildingLength: 0,
            buildingWidth: 0,
            roofSlope: 0,
            aspectRatio: 1,
            volumeToSurfaceRatio: 0,
          },
        };
      }

      return null;
    } catch (error) {
      console.error("❌ FAILED TO GET CLASSIFICATION RESULTS:", error);
      return null;
    }
  }

  /**
   * Check if ML API is available for load criteria classification
   */
  static async checkAPIHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.ML_API_ENDPOINT}/health`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        timeout: 5000,
      });

      return response.ok;
    } catch (error) {
      console.warn("Load Criteria ML API health check failed:", error);
      return false;
    }
  }
}

export default LoadCriteriaClassifier;
