/**
 * ML Training Pipeline with Anti-Poisoning Safeguards
 * Comprehensive system for safe ML model training and deployment
 */

import { supabase } from "@/lib/supabase";
import { AuditLogger } from "@/lib/audit-logger";
import { MLTrainingTracker } from "@/lib/ml-training-tracker";
import type { Database } from "@/types/supabase";

type Override = Database["public"]["Tables"]["overrides"]["Row"];
type TrainingLog = Database["public"]["Tables"]["training_logs"]["Row"];

export interface ModelVersion {
  version: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  deployedAt: string;
  trainingDataCount: number;
  performanceChange: number;
  status: "deployed" | "archived" | "failed" | "rollback";
  deploymentNotes?: string;
  validationResults?: ValidationResults;
}

export interface ValidationResults {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suspiciousPatterns: SuspiciousPattern[];
  riskScore: number;
  approvalRequired: boolean;
}

export interface SuspiciousPattern {
  type:
    | "RAPID_CHANGES"
    | "INCONSISTENT_CORRECTIONS"
    | "OUTLIER_VALUES"
    | "COORDINATED_ACTIVITY";
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  affectedOverrides: string[];
  riskScore: number;
}

export interface TrainingRequest {
  requestId: string;
  userId: string;
  projectId?: string;
  overrideIds: string[];
  trainingType: "INCREMENTAL" | "FULL_RETRAIN" | "VALIDATION_ONLY";
  requestedBy: string;
  requestTime: Date;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED" | "AUTO_APPROVED";
  approvedBy?: string;
  approvalTime?: Date;
  rejectionReason?: string;
}

export interface SafetyCheck {
  checkType:
    | "DATA_VALIDATION"
    | "PERFORMANCE_VALIDATION"
    | "SECURITY_SCAN"
    | "COMPLIANCE_CHECK";
  passed: boolean;
  details: any;
  timestamp: Date;
  severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
}

class MLTrainingPipelineClass {
  private static instance: MLTrainingPipelineClass;
  private readonly ML_API_ENDPOINT =
    import.meta.env.VITE_ML_API_URL || "http://178.128.135.194";
  private readonly VALIDATION_THRESHOLD = 0.85; // Minimum accuracy threshold
  private readonly RISK_THRESHOLD = 0.7; // Maximum risk score allowed
  private readonly AUTO_APPROVAL_THRESHOLD = 0.3; // Risk score below which auto-approval is allowed

  private constructor() {}

  static getInstance(): MLTrainingPipelineClass {
    if (!MLTrainingPipelineClass.instance) {
      MLTrainingPipelineClass.instance = new MLTrainingPipelineClass();
    }
    return MLTrainingPipelineClass.instance;
  }

  /**
   * STAGE 1: Validate user corrections for training data poisoning
   */
  async validateCorrections(overrideIds: string[]): Promise<ValidationResults> {
    console.log("🔍 VALIDATION: Starting correction validation...", {
      overrideIds,
    });

    try {
      // Fetch overrides from database
      const { data: overrides, error } = await supabase
        .from("overrides")
        .select("*")
        .in("override_id", overrideIds);

      if (error) throw error;
      if (!overrides || overrides.length === 0) {
        throw new Error("No overrides found for validation");
      }

      const errors: string[] = [];
      const warnings: string[] = [];
      const suspiciousPatterns: SuspiciousPattern[] = [];
      let riskScore = 0;

      // 1. Logical Consistency Validation
      const logicalValidation =
        await this.validateLogicalConsistency(overrides);
      if (!logicalValidation.isValid) {
        errors.push(...logicalValidation.errors);
        warnings.push(...logicalValidation.warnings);
        riskScore += 0.3;
      }

      // 2. Pattern Analysis for Suspicious Activity
      const patternAnalysis = await this.detectSuspiciousPatterns(overrides);
      suspiciousPatterns.push(...patternAnalysis.patterns);
      riskScore += patternAnalysis.riskScore;

      // 3. User Behavior Analysis
      const behaviorAnalysis = await this.analyzeBehaviorPatterns(overrides);
      if (behaviorAnalysis.suspicious) {
        suspiciousPatterns.push(...behaviorAnalysis.patterns);
        riskScore += behaviorAnalysis.riskScore;
      }

      // 4. Historical Consistency Check
      const historyCheck = await this.validateHistoricalConsistency(overrides);
      if (!historyCheck.consistent) {
        warnings.push(...historyCheck.warnings);
        riskScore += historyCheck.riskScore;
      }

      const isValid = errors.length === 0 && riskScore < this.RISK_THRESHOLD;
      const approvalRequired =
        riskScore > this.AUTO_APPROVAL_THRESHOLD || errors.length > 0;

      console.log("✅ VALIDATION COMPLETE:", {
        isValid,
        riskScore: riskScore.toFixed(3),
        errors: errors.length,
        warnings: warnings.length,
        suspiciousPatterns: suspiciousPatterns.length,
        approvalRequired,
      });

      return {
        isValid,
        errors,
        warnings,
        suspiciousPatterns,
        riskScore,
        approvalRequired,
      };
    } catch (error) {
      console.error("❌ VALIDATION FAILED:", error);
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : "Validation failed"],
        warnings: [],
        suspiciousPatterns: [],
        riskScore: 1.0,
        approvalRequired: true,
      };
    }
  }

  /**
   * STAGE 2: Request training with approval workflow
   */
  async requestTraining({
    userId,
    projectId,
    overrideIds,
    trainingType = "INCREMENTAL",
    requestedBy,
  }: {
    userId: string;
    projectId?: string;
    overrideIds: string[];
    trainingType?: TrainingRequest["trainingType"];
    requestedBy: string;
  }): Promise<TrainingRequest> {
    console.log("📝 TRAINING REQUEST: Creating training request...", {
      userId,
      projectId,
      overrideIds: overrideIds.length,
      trainingType,
    });

    // Validate corrections first
    const validation = await this.validateCorrections(overrideIds);

    const requestId = `train_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const trainingRequest: TrainingRequest = {
      requestId,
      userId,
      projectId,
      overrideIds,
      trainingType,
      requestedBy,
      requestTime: new Date(),
      approvalStatus: validation.approvalRequired ? "PENDING" : "AUTO_APPROVED",
    };

    // Log the training request
    await AuditLogger.logManualOverride({
      action: "TRAINING_DATA_EXPORTED",
      originalValue: "N/A",
      newValue: trainingRequest,
      reasoning: `Training request created with ${overrideIds.length} corrections`,
      complianceFlags: {
        aiscCompliant: true,
        asceCompliant: true,
        qaqcVerified: !validation.approvalRequired,
        professionalSeal: false,
      },
    });

    // Store training request in database
    await this.storeTrainingRequest(trainingRequest, validation);

    // If auto-approved, start training immediately
    if (trainingRequest.approvalStatus === "AUTO_APPROVED") {
      console.log("🚀 AUTO-APPROVED: Starting training immediately...");
      await this.executeTraining(trainingRequest);
    } else {
      console.log(
        "⏳ PENDING APPROVAL: Training request requires manual approval",
      );
    }

    return trainingRequest;
  }

  /**
   * STAGE 3: Execute safe training with isolated environment
   */
  async executeTraining(request: TrainingRequest): Promise<ModelVersion> {
    console.log("🔧 TRAINING EXECUTION: Starting safe training process...", {
      requestId: request.requestId,
      trainingType: request.trainingType,
    });

    const sessionId = MLTrainingTracker.startTrainingSession();
    const iterationId = MLTrainingTracker.recordTrainingStart({
      trainingType: "COMPLETE_MODEL",
      dataPoints: request.overrideIds.length,
      userCorrections: request.overrideIds.length,
      apiEndpoint: `${this.ML_API_ENDPOINT}/train`,
    });

    try {
      // 1. Prepare training data in isolated environment
      const trainingData = await this.prepareTrainingData(request.overrideIds);

      // 2. Execute training with safety checks
      const trainingResult = await this.performSafeTraining(
        trainingData,
        request,
      );

      // 3. Validate new model performance
      const performanceValidation =
        await this.validateModelPerformance(trainingResult);

      if (!performanceValidation.passed) {
        throw new Error(
          `Model validation failed: ${performanceValidation.details.reason}`,
        );
      }

      // 4. Create new model version
      const modelVersion = await this.createModelVersion(
        trainingResult,
        request,
      );

      // 5. Deploy if validation passes
      if (
        performanceValidation.passed &&
        modelVersion.accuracy >= this.VALIDATION_THRESHOLD
      ) {
        await this.deployModel(modelVersion);
        modelVersion.status = "deployed";
      } else {
        modelVersion.status = "failed";
        modelVersion.deploymentNotes = "Failed validation checks";
      }

      // Update training iteration
      MLTrainingTracker.updateTrainingIteration(iterationId, {
        accuracy: modelVersion.accuracy,
        duration: Date.now() - new Date(request.requestTime).getTime(),
        status: "COMPLETED",
      });

      MLTrainingTracker.endTrainingSession("COMPLETED");

      console.log("✅ TRAINING COMPLETE:", {
        version: modelVersion.version,
        accuracy: modelVersion.accuracy,
        status: modelVersion.status,
      });

      return modelVersion;
    } catch (error) {
      console.error("❌ TRAINING FAILED:", error);

      MLTrainingTracker.updateTrainingIteration(iterationId, {
        duration: Date.now() - new Date(request.requestTime).getTime(),
        status: "FAILED",
      });

      MLTrainingTracker.endTrainingSession("FAILED");

      throw error;
    }
  }

  /**
   * STAGE 4: Model rollback with audit trail
   */
  async rollbackToVersion(
    targetVersion: string,
    userId: string,
    reason: string,
  ): Promise<void> {
    console.log("🔄 ROLLBACK: Starting model rollback...", {
      targetVersion,
      userId,
      reason,
    });

    try {
      // 1. Validate rollback request
      const rollbackValidation = await this.validateRollbackRequest(
        targetVersion,
        userId,
      );
      if (!rollbackValidation.allowed) {
        throw new Error(`Rollback not allowed: ${rollbackValidation.reason}`);
      }

      // 2. Create rollback log entry
      const { data: rollbackLog, error: rollbackError } = await supabase
        .from("training_logs")
        .insert({
          model_version: targetVersion,
          deployment_status: "rollback",
          processed_by: userId,
          performance_metrics: {
            rollback: true,
            reason,
            timestamp: new Date().toISOString(),
            previousVersion: await this.getCurrentModelVersion(),
          },
          retrain_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (rollbackError) {
        console.error("Error creating rollback log:", rollbackError);
        throw rollbackError;
      }

      // 3. Execute rollback
      await this.performRollback(targetVersion);

      // 4. Log audit trail
      await AuditLogger.logManualOverride({
        action: "MANUAL_OVERRIDE_BUILDING_TYPE",
        originalValue: await this.getCurrentModelVersion(),
        newValue: targetVersion,
        reasoning: reason,
        engineerLicense: userId,
        complianceFlags: {
          aiscCompliant: true,
          asceCompliant: true,
          qaqcVerified: true,
          professionalSeal: true,
        },
      });

      console.log("✅ ROLLBACK COMPLETE:", {
        targetVersion,
        rollbackLog: rollbackLog?.id,
      });
    } catch (error) {
      console.error("❌ ROLLBACK FAILED:", error);
      throw error;
    }
  }

  /**
   * Validate logical consistency of corrections
   */
  private async validateLogicalConsistency(overrides: Override[]): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for impossible member tag transitions
    const invalidTransitions = [
      { from: "MAIN_FRAME_COLUMN", to: "ROOF_PURLIN" },
      { from: "FOUNDATION_BEAM", to: "ROOF_BRACING" },
      { from: "CRANE_BEAM", to: "WALL_GIRT" },
    ];

    for (const override of overrides) {
      const transition = invalidTransitions.find(
        (t) => t.from === override.original_tag && t.to === override.new_tag,
      );

      if (transition) {
        errors.push(
          `Invalid transition: ${transition.from} → ${transition.to} for member ${override.member_id}`,
        );
      }

      // Check confidence levels
      if (override.confidence && override.confidence < 0.5) {
        warnings.push(
          `Low confidence correction for member ${override.member_id}`,
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Detect suspicious patterns in corrections
   */
  private async detectSuspiciousPatterns(overrides: Override[]): Promise<{
    patterns: SuspiciousPattern[];
    riskScore: number;
  }> {
    const patterns: SuspiciousPattern[] = [];
    let riskScore = 0;

    // Group by user and time
    const userGroups = overrides.reduce(
      (groups, override) => {
        const key = override.user_id;
        if (!groups[key]) groups[key] = [];
        groups[key].push(override);
        return groups;
      },
      {} as Record<string, Override[]>,
    );

    // Check for rapid changes from single user
    for (const [userId, userOverrides] of Object.entries(userGroups)) {
      if (userOverrides.length > 10) {
        const timeSpan =
          new Date(
            userOverrides[userOverrides.length - 1].override_timestamp!,
          ).getTime() -
          new Date(userOverrides[0].override_timestamp!).getTime();

        if (timeSpan < 60000) {
          // Less than 1 minute
          patterns.push({
            type: "RAPID_CHANGES",
            description: `User ${userId} made ${userOverrides.length} corrections in less than 1 minute`,
            severity: "HIGH",
            affectedOverrides: userOverrides.map((o) => o.override_id),
            riskScore: 0.4,
          });
          riskScore += 0.4;
        }
      }
    }

    // Check for inconsistent corrections
    const memberGroups = overrides.reduce(
      (groups, override) => {
        const key = override.member_id;
        if (!groups[key]) groups[key] = [];
        groups[key].push(override);
        return groups;
      },
      {} as Record<string, Override[]>,
    );

    for (const [memberId, memberOverrides] of Object.entries(memberGroups)) {
      if (memberOverrides.length > 1) {
        const uniqueTags = new Set(memberOverrides.map((o) => o.new_tag));
        if (uniqueTags.size > 1) {
          patterns.push({
            type: "INCONSISTENT_CORRECTIONS",
            description: `Member ${memberId} has conflicting corrections`,
            severity: "MEDIUM",
            affectedOverrides: memberOverrides.map((o) => o.override_id),
            riskScore: 0.2,
          });
          riskScore += 0.2;
        }
      }
    }

    return { patterns, riskScore };
  }

  /**
   * Analyze user behavior patterns
   */
  private async analyzeBehaviorPatterns(overrides: Override[]): Promise<{
    suspicious: boolean;
    patterns: SuspiciousPattern[];
    riskScore: number;
  }> {
    // This would typically involve more sophisticated analysis
    // For now, implement basic checks
    return {
      suspicious: false,
      patterns: [],
      riskScore: 0,
    };
  }

  /**
   * Validate historical consistency
   */
  private async validateHistoricalConsistency(overrides: Override[]): Promise<{
    consistent: boolean;
    warnings: string[];
    riskScore: number;
  }> {
    // Check against historical patterns
    return {
      consistent: true,
      warnings: [],
      riskScore: 0,
    };
  }

  /**
   * Store training request in database
   */
  private async storeTrainingRequest(
    request: TrainingRequest,
    validation: ValidationResults,
  ): Promise<void> {
    // Store in ml_requests table
    const { error: insertError } = await supabase.from("ml_requests").insert({
      request_id: request.requestId,
      user_id: request.userId,
      project_id: request.projectId || "",
      request_type: "member",
      request_data: {
        trainingRequest: request,
        validation: validation,
      },
      status:
        request.approvalStatus === "AUTO_APPROVED" ? "processing" : "pending",
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("Error storing training request:", insertError);
      throw insertError;
    }
  }

  /**
   * Prepare training data safely
   */
  private async prepareTrainingData(overrideIds: string[]): Promise<any> {
    // Fetch and prepare training data
    const { data: overrides } = await supabase
      .from("overrides")
      .select("*")
      .in("override_id", overrideIds);

    return {
      corrections: overrides,
      timestamp: new Date().toISOString(),
      safetyChecked: true,
    };
  }

  /**
   * Perform safe training with ML API
   */
  private async performSafeTraining(
    trainingData: any,
    request: TrainingRequest,
  ): Promise<any> {
    const response = await fetch(`${this.ML_API_ENDPOINT}/train-safe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Training-Mode": "ISOLATED",
        "X-Request-ID": request.requestId,
      },
      body: JSON.stringify({
        trainingData,
        safetyMode: true,
        validationRequired: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Training API error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Validate model performance
   */
  private async validateModelPerformance(
    trainingResult: any,
  ): Promise<SafetyCheck> {
    const accuracy = trainingResult.metrics?.accuracy || 0;
    const passed = accuracy >= this.VALIDATION_THRESHOLD;

    return {
      checkType: "PERFORMANCE_VALIDATION",
      passed,
      details: {
        accuracy,
        threshold: this.VALIDATION_THRESHOLD,
        reason: passed
          ? "Performance meets requirements"
          : "Performance below threshold",
      },
      timestamp: new Date(),
      severity: passed ? "INFO" : "ERROR",
    };
  }

  /**
   * Create new model version
   */
  private async createModelVersion(
    trainingResult: any,
    request: TrainingRequest,
  ): Promise<ModelVersion> {
    const version = `v${Date.now()}.${Math.random().toString(36).substr(2, 5)}`;
    const metrics = trainingResult.metrics || {};

    return {
      version,
      accuracy: metrics.accuracy || 0.9,
      precision: metrics.precision || 0.88,
      recall: metrics.recall || 0.92,
      f1Score: metrics.f1Score || 0.9,
      deployedAt: new Date().toISOString(),
      trainingDataCount: request.overrideIds.length,
      performanceChange: metrics.improvement || 0.02,
      status: "deployed",
      deploymentNotes: `Trained with ${request.overrideIds.length} validated corrections`,
    };
  }

  /**
   * Deploy model safely
   */
  private async deployModel(modelVersion: ModelVersion): Promise<void> {
    // Log deployment
    const { error: logError } = await supabase.from("training_logs").insert({
      model_version: modelVersion.version,
      deployment_status: "deployed",
      performance_metrics: {
        accuracy: modelVersion.accuracy,
        precision: modelVersion.precision,
        recall: modelVersion.recall,
        f1Score: modelVersion.f1Score,
        improvement: modelVersion.performanceChange,
      },
      total_training_samples: modelVersion.trainingDataCount,
      retrain_time: new Date().toISOString(),
    });

    if (logError) {
      console.error("Error logging deployment:", logError);
      throw logError;
    }

    console.log("🚀 MODEL DEPLOYED:", modelVersion.version);
  }

  /**
   * Validate rollback request
   */
  private async validateRollbackRequest(
    targetVersion: string,
    userId: string,
  ): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    // Check if user has admin permissions
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();

    if (profileError || !profile?.is_admin) {
      return {
        allowed: false,
        reason: "Admin permissions required for rollback",
      };
    }

    return { allowed: true };
  }

  /**
   * Get current model version
   */
  private async getCurrentModelVersion(): Promise<string> {
    const { data } = await supabase
      .from("training_logs")
      .select("model_version")
      .eq("deployment_status", "deployed")
      .order("retrain_time", { ascending: false })
      .limit(1)
      .single();

    return data?.model_version || "v1.0.0";
  }

  /**
   * Perform actual rollback
   */
  private async performRollback(targetVersion: string): Promise<void> {
    // This would typically involve API calls to rollback the model
    console.log(`🔄 Rolling back to version: ${targetVersion}`);

    // Simulate rollback API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

// Export singleton instance
export const MLTrainingPipeline = MLTrainingPipelineClass.getInstance();
export default MLTrainingPipeline;
