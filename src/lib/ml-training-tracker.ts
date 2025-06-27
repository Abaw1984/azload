/**
 * ML Training Tracker - Real Training Iteration Counter
 * Tracks actual ML API training iterations with live counters
 * NO FAKE DATA - Only true values from real training sessions
 */

export interface TrainingIteration {
  id: string;
  timestamp: Date;
  iterationNumber: number;
  trainingType: "BUILDING_CLASSIFICATION" | "MEMBER_TAGGING" | "COMPLETE_MODEL";
  dataPoints: number;
  accuracy?: number;
  loss?: number;
  validationAccuracy?: number;
  modelVersion: string;
  duration: number; // in milliseconds
  status: "STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  userCorrections: number;
  apiEndpoint: string;
}

export interface TrainingSession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  totalIterations: number;
  completedIterations: number;
  failedIterations: number;
  averageAccuracy: number;
  totalDataPoints: number;
  status: "ACTIVE" | "COMPLETED" | "FAILED";
}

export interface TrainingMetrics {
  totalIterations: number;
  totalSessions: number;
  totalTrainingTime: number; // in milliseconds
  averageIterationsPerSession: number;
  successRate: number;
  lastTrainingTime: Date | null;
  currentSession: TrainingSession | null;
  recentIterations: TrainingIteration[];
  cumulativeDataPoints: number;
  modelImprovements: {
    accuracyTrend: number[];
    lossTrend: number[];
    iterationTrend: number[];
  };
}

class MLTrainingTrackerClass {
  private static instance: MLTrainingTrackerClass;
  private iterations: TrainingIteration[] = [];
  private sessions: TrainingSession[] = [];
  private currentSession: TrainingSession | null = null;
  private listeners: Set<() => void> = new Set();
  private storageKey = "ml_training_tracker";
  private sessionStorageKey = "ml_current_session";

  private constructor() {
    this.loadFromStorage();
    this.setupStorageListener();
  }

  static getInstance(): MLTrainingTrackerClass {
    if (!MLTrainingTrackerClass.instance) {
      MLTrainingTrackerClass.instance = new MLTrainingTrackerClass();
    }
    return MLTrainingTrackerClass.instance;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.iterations =
          data.iterations?.map((iter: any) => ({
            ...iter,
            timestamp: new Date(iter.timestamp),
          })) || [];
        this.sessions =
          data.sessions?.map((session: any) => ({
            ...session,
            startTime: new Date(session.startTime),
            endTime: session.endTime ? new Date(session.endTime) : undefined,
          })) || [];
      }

      const currentSessionData = sessionStorage.getItem(this.sessionStorageKey);
      if (currentSessionData) {
        const session = JSON.parse(currentSessionData);
        this.currentSession = {
          ...session,
          startTime: new Date(session.startTime),
          endTime: session.endTime ? new Date(session.endTime) : undefined,
        };
      }
    } catch (error) {
      console.error("Failed to load training tracker data:", error);
      this.iterations = [];
      this.sessions = [];
      this.currentSession = null;
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        iterations: this.iterations,
        sessions: this.sessions,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));

      if (this.currentSession) {
        sessionStorage.setItem(
          this.sessionStorageKey,
          JSON.stringify(this.currentSession),
        );
      } else {
        sessionStorage.removeItem(this.sessionStorageKey);
      }
    } catch (error) {
      console.error("Failed to save training tracker data:", error);
    }
  }

  private setupStorageListener(): void {
    // Listen for storage changes from other tabs/windows
    window.addEventListener("storage", (event) => {
      if (event.key === this.storageKey) {
        this.loadFromStorage();
        this.notify();
      }
    });
  }

  /**
   * Start a new training session
   */
  startTrainingSession(): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // End current session if exists
    if (this.currentSession && this.currentSession.status === "ACTIVE") {
      this.endTrainingSession("COMPLETED");
    }

    this.currentSession = {
      sessionId,
      startTime: new Date(),
      totalIterations: 0,
      completedIterations: 0,
      failedIterations: 0,
      averageAccuracy: 0,
      totalDataPoints: 0,
      status: "ACTIVE",
    };

    console.log("🚀 ML TRAINING SESSION STARTED:", {
      sessionId,
      timestamp: new Date().toISOString(),
    });

    this.saveToStorage();
    this.notify();
    return sessionId;
  }

  /**
   * End the current training session
   */
  endTrainingSession(status: "COMPLETED" | "FAILED"): void {
    if (!this.currentSession) {
      console.warn("No active training session to end");
      return;
    }

    this.currentSession.endTime = new Date();
    this.currentSession.status = status;

    // Calculate final metrics
    const sessionIterations = this.iterations.filter(
      (iter) => iter.timestamp >= this.currentSession!.startTime,
    );

    if (sessionIterations.length > 0) {
      const accuracies = sessionIterations
        .filter((iter) => iter.accuracy !== undefined)
        .map((iter) => iter.accuracy!);

      this.currentSession.averageAccuracy =
        accuracies.length > 0
          ? accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length
          : 0;
    }

    this.sessions.push({ ...this.currentSession });
    this.currentSession = null;

    console.log("🏁 ML TRAINING SESSION ENDED:", {
      status,
      totalIterations: sessionIterations.length,
      timestamp: new Date().toISOString(),
    });

    this.saveToStorage();
    this.notify();
  }

  /**
   * Record a real training iteration - ONLY CALL WITH ACTUAL TRAINING DATA
   */
  recordTrainingIteration(data: {
    trainingType: TrainingIteration["trainingType"];
    dataPoints: number;
    accuracy?: number;
    loss?: number;
    validationAccuracy?: number;
    duration: number;
    userCorrections: number;
    apiEndpoint: string;
    status?: TrainingIteration["status"];
  }): string {
    const iterationId = `iter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const iterationNumber = this.iterations.length + 1;

    const iteration: TrainingIteration = {
      id: iterationId,
      timestamp: new Date(),
      iterationNumber,
      trainingType: data.trainingType,
      dataPoints: data.dataPoints,
      accuracy: data.accuracy,
      loss: data.loss,
      validationAccuracy: data.validationAccuracy,
      modelVersion: `v${iterationNumber}.${Date.now()}`,
      duration: data.duration,
      status: data.status || "COMPLETED",
      userCorrections: data.userCorrections,
      apiEndpoint: data.apiEndpoint,
    };

    this.iterations.push(iteration);

    // Update current session if active
    if (this.currentSession) {
      this.currentSession.totalIterations++;
      this.currentSession.totalDataPoints += data.dataPoints;

      if (iteration.status === "COMPLETED") {
        this.currentSession.completedIterations++;
      } else if (iteration.status === "FAILED") {
        this.currentSession.failedIterations++;
      }
    }

    console.log("📊 REAL TRAINING ITERATION RECORDED:", {
      iterationNumber,
      trainingType: data.trainingType,
      dataPoints: data.dataPoints,
      accuracy: data.accuracy,
      duration: data.duration,
      timestamp: new Date().toISOString(),
    });

    this.saveToStorage();
    this.notify();
    return iterationId;
  }

  /**
   * Record training start (when API call begins)
   */
  recordTrainingStart(data: {
    trainingType: TrainingIteration["trainingType"];
    dataPoints: number;
    userCorrections: number;
    apiEndpoint: string;
  }): string {
    return this.recordTrainingIteration({
      ...data,
      duration: 0,
      status: "STARTED",
    });
  }

  /**
   * Update training iteration with completion data
   */
  updateTrainingIteration(
    iterationId: string,
    updates: {
      accuracy?: number;
      loss?: number;
      validationAccuracy?: number;
      duration: number;
      status: TrainingIteration["status"];
    },
  ): void {
    const iteration = this.iterations.find((iter) => iter.id === iterationId);
    if (!iteration) {
      console.warn("Training iteration not found:", iterationId);
      return;
    }

    Object.assign(iteration, updates);

    console.log("📈 TRAINING ITERATION UPDATED:", {
      iterationId,
      status: updates.status,
      accuracy: updates.accuracy,
      duration: updates.duration,
    });

    this.saveToStorage();
    this.notify();
  }

  /**
   * Get comprehensive training metrics - ALL REAL DATA
   */
  getTrainingMetrics(): TrainingMetrics {
    const completedIterations = this.iterations.filter(
      (iter) => iter.status === "COMPLETED",
    );
    const totalTrainingTime = this.iterations.reduce(
      (sum, iter) => sum + iter.duration,
      0,
    );
    const completedSessions = this.sessions.filter(
      (session) => session.status === "COMPLETED",
    );

    // Calculate success rate
    const successRate =
      this.iterations.length > 0
        ? completedIterations.length / this.iterations.length
        : 0;

    // Get accuracy trend from completed iterations
    const accuracyTrend = completedIterations
      .filter((iter) => iter.accuracy !== undefined)
      .map((iter) => iter.accuracy!);

    // Get loss trend from completed iterations
    const lossTrend = completedIterations
      .filter((iter) => iter.loss !== undefined)
      .map((iter) => iter.loss!);

    // Get iteration numbers for trend analysis
    const iterationTrend = completedIterations.map(
      (iter) => iter.iterationNumber,
    );

    return {
      totalIterations: this.iterations.length,
      totalSessions: this.sessions.length,
      totalTrainingTime,
      averageIterationsPerSession:
        this.sessions.length > 0
          ? this.iterations.length / this.sessions.length
          : 0,
      successRate,
      lastTrainingTime:
        this.iterations.length > 0
          ? this.iterations[this.iterations.length - 1].timestamp
          : null,
      currentSession: this.currentSession,
      recentIterations: this.iterations.slice(-10), // Last 10 iterations
      cumulativeDataPoints: this.iterations.reduce(
        (sum, iter) => sum + iter.dataPoints,
        0,
      ),
      modelImprovements: {
        accuracyTrend,
        lossTrend,
        iterationTrend,
      },
    };
  }

  /**
   * Get live training status
   */
  getLiveStatus(): {
    isTraining: boolean;
    currentIteration: number;
    sessionActive: boolean;
    lastIterationTime: Date | null;
    iterationsToday: number;
    iterationsThisWeek: number;
  } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const iterationsToday = this.iterations.filter(
      (iter) => iter.timestamp >= today,
    ).length;

    const iterationsThisWeek = this.iterations.filter(
      (iter) => iter.timestamp >= weekAgo,
    ).length;

    const activeIterations = this.iterations.filter(
      (iter) => iter.status === "STARTED" || iter.status === "IN_PROGRESS",
    );

    return {
      isTraining: activeIterations.length > 0,
      currentIteration: this.iterations.length,
      sessionActive: this.currentSession?.status === "ACTIVE" || false,
      lastIterationTime:
        this.iterations.length > 0
          ? this.iterations[this.iterations.length - 1].timestamp
          : null,
      iterationsToday,
      iterationsThisWeek,
    };
  }

  /**
   * Get training history for analysis
   */
  getTrainingHistory(): {
    iterations: TrainingIteration[];
    sessions: TrainingSession[];
    statistics: {
      totalDataPointsProcessed: number;
      averageAccuracy: number;
      averageTrainingTime: number;
      mostCommonTrainingType: string;
      improvementRate: number;
    };
  } {
    const completedIterations = this.iterations.filter(
      (iter) => iter.status === "COMPLETED",
    );
    const accuracies = completedIterations
      .filter((iter) => iter.accuracy !== undefined)
      .map((iter) => iter.accuracy!);

    const averageAccuracy =
      accuracies.length > 0
        ? accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length
        : 0;

    const averageTrainingTime =
      completedIterations.length > 0
        ? completedIterations.reduce((sum, iter) => sum + iter.duration, 0) /
          completedIterations.length
        : 0;

    // Find most common training type
    const trainingTypeCounts = this.iterations.reduce(
      (counts, iter) => {
        counts[iter.trainingType] = (counts[iter.trainingType] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>,
    );

    const mostCommonTrainingType =
      Object.entries(trainingTypeCounts).sort(
        ([, a], [, b]) => b - a,
      )[0]?.[0] || "NONE";

    // Calculate improvement rate (accuracy improvement over time)
    let improvementRate = 0;
    if (accuracies.length >= 2) {
      const firstHalf = accuracies.slice(0, Math.floor(accuracies.length / 2));
      const secondHalf = accuracies.slice(Math.floor(accuracies.length / 2));

      const firstHalfAvg =
        firstHalf.reduce((sum, acc) => sum + acc, 0) / firstHalf.length;
      const secondHalfAvg =
        secondHalf.reduce((sum, acc) => sum + acc, 0) / secondHalf.length;

      improvementRate = secondHalfAvg - firstHalfAvg;
    }

    return {
      iterations: [...this.iterations],
      sessions: [...this.sessions],
      statistics: {
        totalDataPointsProcessed: this.iterations.reduce(
          (sum, iter) => sum + iter.dataPoints,
          0,
        ),
        averageAccuracy,
        averageTrainingTime,
        mostCommonTrainingType,
        improvementRate,
      },
    };
  }

  /**
   * Clear all training data (use with caution)
   */
  clearTrainingData(): void {
    this.iterations = [];
    this.sessions = [];
    this.currentSession = null;

    localStorage.removeItem(this.storageKey);
    sessionStorage.removeItem(this.sessionStorageKey);

    console.log("🗑️ ALL TRAINING DATA CLEARED");
    this.notify();
  }

  /**
   * Export training data for analysis
   */
  exportTrainingData(): {
    exportDate: string;
    totalIterations: number;
    iterations: TrainingIteration[];
    sessions: TrainingSession[];
    metrics: TrainingMetrics;
  } {
    return {
      exportDate: new Date().toISOString(),
      totalIterations: this.iterations.length,
      iterations: [...this.iterations],
      sessions: [...this.sessions],
      metrics: this.getTrainingMetrics(),
    };
  }
}

// Export singleton instance
export const MLTrainingTracker = MLTrainingTrackerClass.getInstance();

// React hook for using training tracker
export function useMLTrainingTracker() {
  const [metrics, setMetrics] = React.useState<TrainingMetrics>(() =>
    MLTrainingTracker.getTrainingMetrics(),
  );
  const [liveStatus, setLiveStatus] = React.useState(() =>
    MLTrainingTracker.getLiveStatus(),
  );

  React.useEffect(() => {
    const updateData = () => {
      setMetrics(MLTrainingTracker.getTrainingMetrics());
      setLiveStatus(MLTrainingTracker.getLiveStatus());
    };

    const unsubscribe = MLTrainingTracker.subscribe(updateData);

    // Update every second for live counters
    const interval = setInterval(updateData, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return {
    metrics,
    liveStatus,
    startSession: () => MLTrainingTracker.startTrainingSession(),
    endSession: (status: "COMPLETED" | "FAILED") =>
      MLTrainingTracker.endTrainingSession(status),
    recordIteration: (
      data: Parameters<typeof MLTrainingTracker.recordTrainingIteration>[0],
    ) => MLTrainingTracker.recordTrainingIteration(data),
    recordStart: (
      data: Parameters<typeof MLTrainingTracker.recordTrainingStart>[0],
    ) => MLTrainingTracker.recordTrainingStart(data),
    updateIteration: (
      id: string,
      updates: Parameters<typeof MLTrainingTracker.updateTrainingIteration>[1],
    ) => MLTrainingTracker.updateTrainingIteration(id, updates),
    getHistory: () => MLTrainingTracker.getTrainingHistory(),
    exportData: () => MLTrainingTracker.exportTrainingData(),
    clearData: () => MLTrainingTracker.clearTrainingData(),
  };
}

// Import React for the hook
import React from "react";
