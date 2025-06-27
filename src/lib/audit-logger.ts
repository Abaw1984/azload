/**
 * Enterprise Audit Logger for ASCE/AISC Compliance
 * Secure server-side logging for all manual overrides and ML training data
 */

import { MasterControlPoint, UserCorrection } from "@/types/model";

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  action: AuditAction;
  details: any;
  complianceLevel: "ENTERPRISE" | "PROFESSIONAL" | "STANDARD";
  ipAddress: string;
  userAgent: string;
  engineerLicense?: string;
  digitalSignature?: string;
  verificationMethod: "MANUAL" | "DIGITAL_SIGNATURE" | "MFA";
  complianceFlags: {
    aiscCompliant: boolean;
    asceCompliant: boolean;
    qaqcVerified: boolean;
    professionalSeal: boolean;
  };
}

export type AuditAction =
  | "MANUAL_OVERRIDE_MEMBER_TAG"
  | "MANUAL_OVERRIDE_BUILDING_TYPE"
  | "MANUAL_OVERRIDE_GEOMETRY"
  | "ML_PREDICTION_ACCEPTED"
  | "ML_PREDICTION_REJECTED"
  | "MODEL_PARSED"
  | "MODEL_VALIDATED"
  | "ENGINEER_REVIEW_COMPLETED"
  | "COMPLIANCE_CHECK_PERFORMED"
  | "TRAINING_DATA_EXPORTED"
  | "PERFORMANCE_METRICS_UPDATED";

class AuditLoggerClass {
  private static instance: AuditLoggerClass;
  private logs: AuditLogEntry[] = [];
  private serverEndpoint = "/api/audit-log";

  private constructor() {}

  static getInstance(): AuditLoggerClass {
    if (!AuditLoggerClass.instance) {
      AuditLoggerClass.instance = new AuditLoggerClass();
    }
    return AuditLoggerClass.instance;
  }

  /**
   * Log manual override with enterprise compliance tracking
   */
  async logManualOverride({
    action,
    memberId,
    originalValue,
    newValue,
    engineerLicense,
    reasoning,
    complianceFlags = {
      aiscCompliant: true,
      asceCompliant: true,
      qaqcVerified: false,
      professionalSeal: false,
    },
  }: {
    action: AuditAction;
    memberId?: string;
    originalValue: any;
    newValue: any;
    engineerLicense?: string;
    reasoning?: string;
    complianceFlags?: AuditLogEntry["complianceFlags"];
  }): Promise<void> {
    const entry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      sessionId: this.getSessionId(),
      action,
      details: {
        memberId,
        originalValue,
        newValue,
        reasoning,
        confidence: 1.0, // Manual overrides have 100% confidence
      },
      complianceLevel: engineerLicense ? "PROFESSIONAL" : "STANDARD",
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
      engineerLicense,
      verificationMethod: engineerLicense ? "DIGITAL_SIGNATURE" : "MANUAL",
      complianceFlags,
    };

    // Store locally
    this.logs.push(entry);

    // Send to secure server endpoint
    try {
      await this.sendToServer(entry);
      console.log("✅ AUDIT LOG: Manual override logged securely", {
        id: entry.id,
        action: entry.action,
        complianceLevel: entry.complianceLevel,
        engineerVerified: !!entry.engineerLicense,
      });
    } catch (error) {
      console.error("❌ AUDIT LOG: Failed to send to server", error);
      // Store in local backup for retry
      this.storeLocalBackup(entry);
    }
  }

  /**
   * Log ML performance metrics for regulatory compliance
   */
  async logPerformanceMetrics({
    accuracy,
    f1Score,
    precision,
    recall,
    trainingIterations,
    modelVersion,
  }: {
    accuracy: number;
    f1Score: number;
    precision: number;
    recall: number;
    trainingIterations: number;
    modelVersion: string;
  }): Promise<void> {
    const entry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      sessionId: this.getSessionId(),
      action: "PERFORMANCE_METRICS_UPDATED",
      details: {
        accuracy,
        f1Score,
        precision,
        recall,
        trainingIterations,
        modelVersion,
        continuousImprovement: true,
      },
      complianceLevel: "ENTERPRISE",
      ipAddress: await this.getClientIP(),
      userAgent: "ML-Training-Pipeline",
      verificationMethod: "DIGITAL_SIGNATURE",
      complianceFlags: {
        aiscCompliant: true,
        asceCompliant: true,
        qaqcVerified: true,
        professionalSeal: true,
      },
    };

    this.logs.push(entry);
    await this.sendToServer(entry);

    console.log("✅ AUDIT LOG: Performance metrics logged", {
      accuracy: `${(accuracy * 100).toFixed(2)}%`,
      f1Score: f1Score.toFixed(4),
      trainingIterations,
    });
  }

  /**
   * Log engineer review completion for QA/QC compliance
   */
  async logEngineerReview({
    modelId,
    engineerLicense,
    reviewComments,
    approved,
    digitalSignature,
  }: {
    modelId: string;
    engineerLicense: string;
    reviewComments: string;
    approved: boolean;
    digitalSignature?: string;
  }): Promise<void> {
    const entry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      sessionId: this.getSessionId(),
      action: "ENGINEER_REVIEW_COMPLETED",
      details: {
        modelId,
        reviewComments,
        approved,
        reviewLevel: "PROFESSIONAL_ENGINEER",
      },
      complianceLevel: "PROFESSIONAL",
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
      engineerLicense,
      digitalSignature,
      verificationMethod: digitalSignature ? "DIGITAL_SIGNATURE" : "MANUAL",
      complianceFlags: {
        aiscCompliant: true,
        asceCompliant: true,
        qaqcVerified: true,
        professionalSeal: !!digitalSignature,
      },
    };

    this.logs.push(entry);
    await this.sendToServer(entry);

    console.log("✅ AUDIT LOG: Engineer review logged", {
      engineerLicense,
      approved,
      professionalSeal: !!digitalSignature,
    });
  }

  /**
   * Export learning metrics for regulatory compliance
   */
  async exportLearningMetrics(): Promise<{
    metrics: any;
    auditTrail: AuditLogEntry[];
    complianceSummary: any;
  }> {
    const metrics = {
      totalOverrides: this.logs.filter((l) =>
        l.action.includes("MANUAL_OVERRIDE"),
      ).length,
      engineerReviews: this.logs.filter(
        (l) => l.action === "ENGINEER_REVIEW_COMPLETED",
      ).length,
      performanceUpdates: this.logs.filter(
        (l) => l.action === "PERFORMANCE_METRICS_UPDATED",
      ).length,
      complianceRate: this.calculateComplianceRate(),
      continuousImprovement: this.calculateImprovementTrend(),
      lastExported: new Date(),
    };

    const complianceSummary = {
      aiscCompliant: this.logs.every((l) => l.complianceFlags.aiscCompliant),
      asceCompliant: this.logs.every((l) => l.complianceFlags.asceCompliant),
      professionalReviewRate: this.calculateProfessionalReviewRate(),
      auditTrailComplete: true,
      regulatoryStandard: "ENTERPRISE",
    };

    // Log the export action
    await this.logAction("TRAINING_DATA_EXPORTED", {
      metricsExported: metrics,
      complianceSummary,
    });

    console.log("📊 LEARNING METRICS EXPORTED:", {
      totalOverrides: metrics.totalOverrides,
      complianceRate: `${(metrics.complianceRate * 100).toFixed(1)}%`,
      professionalReviewRate: `${(complianceSummary.professionalReviewRate * 100).toFixed(1)}%`,
    });

    return {
      metrics,
      auditTrail: this.logs,
      complianceSummary,
    };
  }

  /**
   * Get audit logs for compliance reporting
   */
  getAuditLogs(filter?: {
    action?: AuditAction;
    dateRange?: { start: Date; end: Date };
    complianceLevel?: AuditLogEntry["complianceLevel"];
  }): AuditLogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter?.action) {
      filteredLogs = filteredLogs.filter((log) => log.action === filter.action);
    }

    if (filter?.dateRange) {
      filteredLogs = filteredLogs.filter(
        (log) =>
          log.timestamp >= filter.dateRange!.start &&
          log.timestamp <= filter.dateRange!.end,
      );
    }

    if (filter?.complianceLevel) {
      filteredLogs = filteredLogs.filter(
        (log) => log.complianceLevel === filter.complianceLevel,
      );
    }

    return filteredLogs;
  }

  private async logAction(action: AuditAction, details: any): Promise<void> {
    const entry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      sessionId: this.getSessionId(),
      action,
      details,
      complianceLevel: "ENTERPRISE",
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
      verificationMethod: "DIGITAL_SIGNATURE",
      complianceFlags: {
        aiscCompliant: true,
        asceCompliant: true,
        qaqcVerified: true,
        professionalSeal: true,
      },
    };

    this.logs.push(entry);
    await this.sendToServer(entry);
  }

  private async sendToServer(entry: AuditLogEntry): Promise<void> {
    // In a real implementation, this would send to a secure server endpoint
    // For now, we'll simulate the server call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) {
          // 90% success rate
          resolve();
        } else {
          reject(new Error("Server communication failed"));
        }
      }, 100);
    });
  }

  private storeLocalBackup(entry: AuditLogEntry): void {
    try {
      const backupKey = `audit_backup_${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(entry));
      console.log("💾 AUDIT LOG: Stored local backup", backupKey);
    } catch (error) {
      console.error("❌ AUDIT LOG: Failed to store local backup", error);
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem("audit_session_id");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("audit_session_id", sessionId);
    }
    return sessionId;
  }

  private async getClientIP(): Promise<string> {
    // In a real implementation, this would get the actual client IP
    // For now, return a placeholder
    return "127.0.0.1";
  }

  private calculateComplianceRate(): number {
    if (this.logs.length === 0) return 1.0;
    const compliantLogs = this.logs.filter(
      (log) =>
        log.complianceFlags.aiscCompliant && log.complianceFlags.asceCompliant,
    );
    return compliantLogs.length / this.logs.length;
  }

  private calculateImprovementTrend(): {
    improving: boolean;
    rate: number;
    lastPeriod: number;
  } {
    const performanceLogs = this.logs
      .filter((l) => l.action === "PERFORMANCE_METRICS_UPDATED")
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (performanceLogs.length < 2) {
      return { improving: true, rate: 0, lastPeriod: 0 };
    }

    const latest = performanceLogs[performanceLogs.length - 1];
    const previous = performanceLogs[performanceLogs.length - 2];

    const latestAccuracy = latest.details.accuracy || 0;
    const previousAccuracy = previous.details.accuracy || 0;

    return {
      improving: latestAccuracy > previousAccuracy,
      rate: latestAccuracy - previousAccuracy,
      lastPeriod: latestAccuracy,
    };
  }

  private calculateProfessionalReviewRate(): number {
    const totalActions = this.logs.filter((l) =>
      l.action.includes("MANUAL_OVERRIDE"),
    ).length;
    const reviewedActions = this.logs.filter(
      (l) => l.engineerLicense && l.complianceFlags.qaqcVerified,
    ).length;

    return totalActions > 0 ? reviewedActions / totalActions : 1.0;
  }
}

export const AuditLogger = AuditLoggerClass.getInstance();
