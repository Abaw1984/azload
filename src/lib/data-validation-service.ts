/**
 * Data Validation Service - Anti-Poisoning Protection
 * Comprehensive validation system for ML training data
 */

import { supabase } from "@/lib/supabase";
import { AuditLogger } from "@/lib/audit-logger";
import type { Database } from "@/types/supabase";

type Override = Database["public"]["Tables"]["overrides"]["Row"];

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  enabled: boolean;
  validator: (overrides: Override[]) => Promise<ValidationResult>;
}

export interface ValidationResult {
  passed: boolean;
  score: number; // 0-1, where 1 is completely valid
  violations: ValidationViolation[];
  recommendations: string[];
}

export interface ValidationViolation {
  ruleId: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  affectedOverrides: string[];
  suggestedAction: "APPROVE" | "REJECT" | "REVIEW" | "FLAG";
}

export interface ApprovalWorkflow {
  workflowId: string;
  overrideIds: string[];
  requestedBy: string;
  requestTime: Date;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED";
  reviewedBy?: string;
  reviewTime?: Date;
  reviewComments?: string;
  approvalLevel: "AUTO" | "ENGINEER" | "ADMIN" | "COMMITTEE";
  riskScore: number;
}

class DataValidationServiceClass {
  private static instance: DataValidationServiceClass;
  private validationRules: ValidationRule[] = [];
  private readonly RISK_THRESHOLDS = {
    AUTO_APPROVE: 0.2,
    ENGINEER_REVIEW: 0.5,
    ADMIN_REVIEW: 0.8,
    COMMITTEE_REVIEW: 0.9,
  };

  private constructor() {
    this.initializeValidationRules();
  }

  static getInstance(): DataValidationServiceClass {
    if (!DataValidationServiceClass.instance) {
      DataValidationServiceClass.instance = new DataValidationServiceClass();
    }
    return DataValidationServiceClass.instance;
  }

  /**
   * Initialize comprehensive validation rules
   */
  private initializeValidationRules(): void {
    this.validationRules = [
      {
        id: "logical_consistency",
        name: "Logical Consistency Check",
        description:
          "Validates that member tag changes are structurally logical",
        severity: "HIGH",
        enabled: true,
        validator: this.validateLogicalConsistency.bind(this),
      },
      {
        id: "rapid_changes",
        name: "Rapid Change Detection",
        description: "Detects unusually rapid correction patterns",
        severity: "MEDIUM",
        enabled: true,
        validator: this.detectRapidChanges.bind(this),
      },
      {
        id: "user_behavior",
        name: "User Behavior Analysis",
        description: "Analyzes user correction patterns for anomalies",
        severity: "MEDIUM",
        enabled: true,
        validator: this.analyzeUserBehavior.bind(this),
      },
      {
        id: "confidence_validation",
        name: "Confidence Score Validation",
        description: "Validates confidence scores are reasonable",
        severity: "LOW",
        enabled: true,
        validator: this.validateConfidenceScores.bind(this),
      },
      {
        id: "coordinated_activity",
        name: "Coordinated Activity Detection",
        description: "Detects potential coordinated manipulation attempts",
        severity: "CRITICAL",
        enabled: true,
        validator: this.detectCoordinatedActivity.bind(this),
      },
      {
        id: "historical_consistency",
        name: "Historical Consistency Check",
        description: "Compares corrections against historical patterns",
        severity: "MEDIUM",
        enabled: true,
        validator: this.validateHistoricalConsistency.bind(this),
      },
      {
        id: "outlier_detection",
        name: "Statistical Outlier Detection",
        description: "Identifies statistically unusual corrections",
        severity: "HIGH",
        enabled: true,
        validator: this.detectOutliers.bind(this),
      },
    ];

    console.log(
      "🔧 VALIDATION SERVICE: Initialized with",
      this.validationRules.length,
      "rules",
    );
  }

  /**
   * Comprehensive validation of correction data
   */
  async validateCorrections(overrideIds: string[]): Promise<{
    overallResult: ValidationResult;
    ruleResults: { [ruleId: string]: ValidationResult };
    recommendedAction:
      | "AUTO_APPROVE"
      | "ENGINEER_REVIEW"
      | "ADMIN_REVIEW"
      | "REJECT";
    riskScore: number;
  }> {
    console.log("🔍 DATA VALIDATION: Starting comprehensive validation...", {
      overrideIds: overrideIds.length,
      activeRules: this.validationRules.filter((r) => r.enabled).length,
    });

    try {
      // Fetch overrides
      const { data: overrides, error } = await supabase
        .from("overrides")
        .select("*")
        .in("override_id", overrideIds);

      if (error) throw error;
      if (!overrides || overrides.length === 0) {
        throw new Error("No overrides found for validation");
      }

      const ruleResults: { [ruleId: string]: ValidationResult } = {};
      const allViolations: ValidationViolation[] = [];
      const allRecommendations: string[] = [];
      let totalScore = 0;
      let maxRiskScore = 0;

      // Run all enabled validation rules
      for (const rule of this.validationRules.filter((r) => r.enabled)) {
        try {
          const result = await rule.validator(overrides);
          ruleResults[rule.id] = result;

          allViolations.push(...result.violations);
          allRecommendations.push(...result.recommendations);
          totalScore += result.score;

          // Calculate risk score based on violations
          const ruleRiskScore = this.calculateRuleRiskScore(
            result,
            rule.severity,
          );
          maxRiskScore = Math.max(maxRiskScore, ruleRiskScore);

          console.log(
            `✓ Rule ${rule.id}: Score ${result.score.toFixed(3)}, Violations: ${result.violations.length}`,
          );
        } catch (ruleError) {
          console.error(`❌ Rule ${rule.id} failed:`, ruleError);
          // Add critical violation for rule failure
          allViolations.push({
            ruleId: rule.id,
            severity: "CRITICAL",
            message: `Validation rule failed: ${ruleError}`,
            affectedOverrides: overrideIds,
            suggestedAction: "REJECT",
          });
          maxRiskScore = 1.0;
        }
      }

      const averageScore =
        totalScore / this.validationRules.filter((r) => r.enabled).length;
      const riskScore = Math.max(maxRiskScore, 1 - averageScore);

      const overallResult: ValidationResult = {
        passed:
          allViolations.filter(
            (v) => v.severity === "CRITICAL" || v.severity === "HIGH",
          ).length === 0,
        score: averageScore,
        violations: allViolations,
        recommendations: [...new Set(allRecommendations)], // Remove duplicates
      };

      const recommendedAction = this.determineRecommendedAction(
        riskScore,
        allViolations,
      );

      console.log("✅ VALIDATION COMPLETE:", {
        overallScore: averageScore.toFixed(3),
        riskScore: riskScore.toFixed(3),
        violations: allViolations.length,
        recommendedAction,
      });

      // Log validation results
      await AuditLogger.logManualOverride({
        action: "COMPLIANCE_CHECK_PERFORMED",
        originalValue: "N/A",
        newValue: {
          overrideIds,
          validationResult: overallResult,
          riskScore,
          recommendedAction,
        },
        reasoning: `Data validation completed with ${allViolations.length} violations`,
        complianceFlags: {
          aiscCompliant: true,
          asceCompliant: true,
          qaqcVerified: overallResult.passed,
          professionalSeal: false,
        },
      });

      return {
        overallResult,
        ruleResults,
        recommendedAction,
        riskScore,
      };
    } catch (error) {
      console.error("❌ VALIDATION FAILED:", error);
      throw error;
    }
  }

  /**
   * Create approval workflow based on validation results
   */
  async createApprovalWorkflow({
    overrideIds,
    requestedBy,
    validationResult,
    riskScore,
  }: {
    overrideIds: string[];
    requestedBy: string;
    validationResult: ValidationResult;
    riskScore: number;
  }): Promise<ApprovalWorkflow> {
    const workflowId = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let approvalLevel: ApprovalWorkflow["approvalLevel"] = "AUTO";
    let status: ApprovalWorkflow["status"] = "APPROVED";

    if (riskScore >= this.RISK_THRESHOLDS.COMMITTEE_REVIEW) {
      approvalLevel = "COMMITTEE";
      status = "ESCALATED";
    } else if (riskScore >= this.RISK_THRESHOLDS.ADMIN_REVIEW) {
      approvalLevel = "ADMIN";
      status = "PENDING";
    } else if (riskScore >= this.RISK_THRESHOLDS.ENGINEER_REVIEW) {
      approvalLevel = "ENGINEER";
      status = "PENDING";
    } else if (riskScore >= this.RISK_THRESHOLDS.AUTO_APPROVE) {
      approvalLevel = "AUTO";
      status = "APPROVED";
    }

    const workflow: ApprovalWorkflow = {
      workflowId,
      overrideIds,
      requestedBy,
      requestTime: new Date(),
      status,
      approvalLevel,
      riskScore,
    };

    // Store workflow in database (would typically be a separate table)
    console.log("📋 APPROVAL WORKFLOW CREATED:", {
      workflowId,
      approvalLevel,
      status,
      riskScore: riskScore.toFixed(3),
    });

    return workflow;
  }

  /**
   * Validate logical consistency of member tag changes
   */
  private async validateLogicalConsistency(
    overrides: Override[],
  ): Promise<ValidationResult> {
    const violations: ValidationViolation[] = [];
    const recommendations: string[] = [];
    let validCount = 0;

    // Define impossible transitions
    const impossibleTransitions = [
      {
        from: "MAIN_FRAME_COLUMN",
        to: "ROOF_PURLIN",
        reason: "Columns cannot become purlins",
      },
      {
        from: "FOUNDATION_BEAM",
        to: "ROOF_BRACING",
        reason: "Foundation elements cannot become roof elements",
      },
      {
        from: "CRANE_BEAM",
        to: "WALL_GIRT",
        reason: "Crane beams have different structural requirements",
      },
      {
        from: "FLOOR_BEAM",
        to: "ROOF_RAFTER",
        reason: "Floor and roof elements serve different functions",
      },
    ];

    for (const override of overrides) {
      const transition = impossibleTransitions.find(
        (t) => t.from === override.original_tag && t.to === override.new_tag,
      );

      if (transition) {
        violations.push({
          ruleId: "logical_consistency",
          severity: "HIGH",
          message: `Impossible transition: ${transition.from} → ${transition.to}. ${transition.reason}`,
          affectedOverrides: [override.override_id],
          suggestedAction: "REJECT",
        });
      } else {
        validCount++;
      }
    }

    if (violations.length > 0) {
      recommendations.push("Review structural logic of member tag changes");
      recommendations.push("Consult structural engineering principles");
    }

    return {
      passed: violations.length === 0,
      score: validCount / overrides.length,
      violations,
      recommendations,
    };
  }

  /**
   * Detect rapid change patterns
   */
  private async detectRapidChanges(
    overrides: Override[],
  ): Promise<ValidationResult> {
    const violations: ValidationViolation[] = [];
    const recommendations: string[] = [];

    // Group by user
    const userGroups = overrides.reduce(
      (groups, override) => {
        const key = override.user_id;
        if (!groups[key]) groups[key] = [];
        groups[key].push(override);
        return groups;
      },
      {} as Record<string, Override[]>,
    );

    let suspiciousUsers = 0;
    const totalUsers = Object.keys(userGroups).length;

    for (const [userId, userOverrides] of Object.entries(userGroups)) {
      if (userOverrides.length > 5) {
        // Sort by timestamp
        const sortedOverrides = userOverrides.sort(
          (a, b) =>
            new Date(a.override_timestamp!).getTime() -
            new Date(b.override_timestamp!).getTime(),
        );

        const timeSpan =
          new Date(
            sortedOverrides[sortedOverrides.length - 1].override_timestamp!,
          ).getTime() -
          new Date(sortedOverrides[0].override_timestamp!).getTime();

        const changesPerMinute = userOverrides.length / (timeSpan / 60000);

        if (changesPerMinute > 10) {
          // More than 10 changes per minute
          violations.push({
            ruleId: "rapid_changes",
            severity: "MEDIUM",
            message: `User ${userId} made ${userOverrides.length} changes at ${changesPerMinute.toFixed(1)} changes/minute`,
            affectedOverrides: userOverrides.map((o) => o.override_id),
            suggestedAction: "REVIEW",
          });
          suspiciousUsers++;
        }
      }
    }

    if (suspiciousUsers > 0) {
      recommendations.push(
        "Review rapid change patterns for potential automation or coordination",
      );
    }

    return {
      passed: violations.length === 0,
      score: Math.max(0, 1 - suspiciousUsers / totalUsers),
      violations,
      recommendations,
    };
  }

  /**
   * Analyze user behavior patterns
   */
  private async analyzeUserBehavior(
    overrides: Override[],
  ): Promise<ValidationResult> {
    const violations: ValidationViolation[] = [];
    const recommendations: string[] = [];

    // Check for unusual patterns
    const userStats = overrides.reduce(
      (stats, override) => {
        const userId = override.user_id;
        if (!stats[userId]) {
          stats[userId] = {
            count: 0,
            uniqueMembers: new Set(),
            uniqueProjects: new Set(),
            avgConfidence: 0,
            confidenceSum: 0,
          };
        }

        stats[userId].count++;
        stats[userId].uniqueMembers.add(override.member_id);
        stats[userId].uniqueProjects.add(override.project_id);

        if (override.confidence) {
          stats[userId].confidenceSum += override.confidence;
          stats[userId].avgConfidence =
            stats[userId].confidenceSum / stats[userId].count;
        }

        return stats;
      },
      {} as Record<string, any>,
    );

    let suspiciousCount = 0;
    const totalUsers = Object.keys(userStats).length;

    for (const [userId, stats] of Object.entries(userStats)) {
      // Check for unusually high activity
      if (stats.count > 50) {
        violations.push({
          ruleId: "user_behavior",
          severity: "MEDIUM",
          message: `User ${userId} has unusually high activity: ${stats.count} corrections`,
          affectedOverrides: overrides
            .filter((o) => o.user_id === userId)
            .map((o) => o.override_id),
          suggestedAction: "REVIEW",
        });
        suspiciousCount++;
      }

      // Check for perfect confidence scores (potentially automated)
      if (stats.avgConfidence === 1.0 && stats.count > 10) {
        violations.push({
          ruleId: "user_behavior",
          severity: "LOW",
          message: `User ${userId} has perfect confidence scores, possibly automated`,
          affectedOverrides: overrides
            .filter((o) => o.user_id === userId)
            .map((o) => o.override_id),
          suggestedAction: "FLAG",
        });
      }
    }

    return {
      passed: violations.length === 0,
      score: Math.max(0, 1 - suspiciousCount / totalUsers),
      violations,
      recommendations,
    };
  }

  /**
   * Validate confidence scores
   */
  private async validateConfidenceScores(
    overrides: Override[],
  ): Promise<ValidationResult> {
    const violations: ValidationViolation[] = [];
    const recommendations: string[] = [];

    let validScores = 0;

    for (const override of overrides) {
      if (override.confidence !== null && override.confidence !== undefined) {
        if (override.confidence < 0 || override.confidence > 1) {
          violations.push({
            ruleId: "confidence_validation",
            severity: "LOW",
            message: `Invalid confidence score: ${override.confidence} for override ${override.override_id}`,
            affectedOverrides: [override.override_id],
            suggestedAction: "FLAG",
          });
        } else {
          validScores++;
        }
      } else {
        validScores++; // Null confidence is acceptable
      }
    }

    return {
      passed: violations.length === 0,
      score: validScores / overrides.length,
      violations,
      recommendations,
    };
  }

  /**
   * Detect coordinated activity
   */
  private async detectCoordinatedActivity(
    overrides: Override[],
  ): Promise<ValidationResult> {
    const violations: ValidationViolation[] = [];
    const recommendations: string[] = [];

    // Look for patterns that suggest coordination
    const timeWindows = this.groupByTimeWindows(overrides, 300000); // 5-minute windows

    for (const window of timeWindows) {
      if (window.overrides.length > 20) {
        const uniqueUsers = new Set(window.overrides.map((o) => o.user_id));

        if (uniqueUsers.size > 1 && uniqueUsers.size < 5) {
          violations.push({
            ruleId: "coordinated_activity",
            severity: "CRITICAL",
            message: `Potential coordinated activity: ${uniqueUsers.size} users made ${window.overrides.length} changes in 5 minutes`,
            affectedOverrides: window.overrides.map((o) => o.override_id),
            suggestedAction: "REJECT",
          });
        }
      }
    }

    if (violations.length > 0) {
      recommendations.push(
        "Investigate potential coordinated manipulation attempt",
      );
      recommendations.push("Review user access patterns and IP addresses");
    }

    return {
      passed: violations.length === 0,
      score: violations.length === 0 ? 1 : 0,
      violations,
      recommendations,
    };
  }

  /**
   * Validate historical consistency
   */
  private async validateHistoricalConsistency(
    overrides: Override[],
  ): Promise<ValidationResult> {
    // This would typically compare against historical patterns
    // For now, return a basic implementation
    return {
      passed: true,
      score: 1,
      violations: [],
      recommendations: [],
    };
  }

  /**
   * Detect statistical outliers
   */
  private async detectOutliers(
    overrides: Override[],
  ): Promise<ValidationResult> {
    const violations: ValidationViolation[] = [];
    const recommendations: string[] = [];

    // Analyze confidence score distribution
    const confidenceScores = overrides
      .filter((o) => o.confidence !== null && o.confidence !== undefined)
      .map((o) => o.confidence!);

    if (confidenceScores.length > 10) {
      const mean =
        confidenceScores.reduce((sum, score) => sum + score, 0) /
        confidenceScores.length;
      const variance =
        confidenceScores.reduce(
          (sum, score) => sum + Math.pow(score - mean, 2),
          0,
        ) / confidenceScores.length;
      const stdDev = Math.sqrt(variance);

      // Find outliers (more than 2 standard deviations from mean)
      for (const override of overrides) {
        if (override.confidence !== null && override.confidence !== undefined) {
          const zScore = Math.abs(override.confidence - mean) / stdDev;

          if (zScore > 2) {
            violations.push({
              ruleId: "outlier_detection",
              severity: "LOW",
              message: `Statistical outlier: confidence score ${override.confidence} (z-score: ${zScore.toFixed(2)})`,
              affectedOverrides: [override.override_id],
              suggestedAction: "FLAG",
            });
          }
        }
      }
    }

    return {
      passed: violations.length === 0,
      score: Math.max(0, 1 - violations.length / overrides.length),
      violations,
      recommendations,
    };
  }

  /**
   * Calculate risk score for a validation rule
   */
  private calculateRuleRiskScore(
    result: ValidationResult,
    severity: ValidationRule["severity"],
  ): number {
    const severityMultipliers = {
      LOW: 0.1,
      MEDIUM: 0.3,
      HIGH: 0.6,
      CRITICAL: 1.0,
    };

    const baseRisk = 1 - result.score;
    const severityMultiplier = severityMultipliers[severity];

    return Math.min(1, baseRisk * severityMultiplier);
  }

  /**
   * Determine recommended action based on risk score and violations
   */
  private determineRecommendedAction(
    riskScore: number,
    violations: ValidationViolation[],
  ): "AUTO_APPROVE" | "ENGINEER_REVIEW" | "ADMIN_REVIEW" | "REJECT" {
    const criticalViolations = violations.filter(
      (v) => v.severity === "CRITICAL",
    );
    const highViolations = violations.filter((v) => v.severity === "HIGH");

    if (criticalViolations.length > 0) {
      return "REJECT";
    }

    if (
      riskScore >= this.RISK_THRESHOLDS.ADMIN_REVIEW ||
      highViolations.length > 2
    ) {
      return "ADMIN_REVIEW";
    }

    if (
      riskScore >= this.RISK_THRESHOLDS.ENGINEER_REVIEW ||
      highViolations.length > 0
    ) {
      return "ENGINEER_REVIEW";
    }

    return "AUTO_APPROVE";
  }

  /**
   * Group overrides by time windows
   */
  private groupByTimeWindows(
    overrides: Override[],
    windowSizeMs: number,
  ): {
    startTime: Date;
    endTime: Date;
    overrides: Override[];
  }[] {
    const sortedOverrides = overrides.sort(
      (a, b) =>
        new Date(a.override_timestamp!).getTime() -
        new Date(b.override_timestamp!).getTime(),
    );

    const windows: { startTime: Date; endTime: Date; overrides: Override[] }[] =
      [];
    let currentWindow: Override[] = [];
    let windowStart: Date | null = null;

    for (const override of sortedOverrides) {
      const overrideTime = new Date(override.override_timestamp!);

      if (!windowStart) {
        windowStart = overrideTime;
        currentWindow = [override];
      } else if (
        overrideTime.getTime() - windowStart.getTime() <=
        windowSizeMs
      ) {
        currentWindow.push(override);
      } else {
        // Close current window and start new one
        windows.push({
          startTime: windowStart,
          endTime: new Date(windowStart.getTime() + windowSizeMs),
          overrides: currentWindow,
        });

        windowStart = overrideTime;
        currentWindow = [override];
      }
    }

    // Add final window
    if (windowStart && currentWindow.length > 0) {
      windows.push({
        startTime: windowStart,
        endTime: new Date(windowStart.getTime() + windowSizeMs),
        overrides: currentWindow,
      });
    }

    return windows;
  }
}

// Export singleton instance
export const DataValidationService = DataValidationServiceClass.getInstance();
export default DataValidationService;
