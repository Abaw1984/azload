import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  BarChart3,
  Brain,
  Clock,
  Download,
  Play,
  Square,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useMLTrainingTracker } from "@/lib/ml-training-tracker";

interface TrainingDashboardProps {
  className?: string;
}

export default function TrainingDashboard({
  className,
}: TrainingDashboardProps) {
  const {
    metrics,
    liveStatus,
    startSession,
    endSession,
    getHistory,
    exportData,
    clearData,
  } = useMLTrainingTracker();

  const handleStartTraining = () => {
    if (liveStatus.sessionActive) {
      endSession("COMPLETED");
    } else {
      startSession();
    }
  };

  const handleExportData = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ml-training-data-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  };

  return (
    <div className={`space-y-6 bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            ML Training Dashboard
          </h2>
          <p className="text-gray-600">
            Real-time tracking of ML training iterations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleStartTraining}
            variant={liveStatus.sessionActive ? "destructive" : "default"}
            className="flex items-center space-x-2"
          >
            {liveStatus.sessionActive ? (
              <Square className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>
              {liveStatus.sessionActive ? "End Session" : "Start Session"}
            </span>
          </Button>
          <Button
            onClick={handleExportData}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Data</span>
          </Button>
        </div>
      </div>

      {/* Live Status Banner */}
      {liveStatus.isTraining && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div>
              <div className="font-medium text-green-900">
                Training in Progress
              </div>
              <div className="text-sm text-green-700">
                Current iteration: #{liveStatus.currentIteration}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Target className="w-4 h-4 text-blue-500" />
              <span>Total Iterations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {metrics.totalIterations}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {liveStatus.iterationsToday > 0
                ? `${liveStatus.iterationsToday} today`
                : "No training today"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Activity className="w-4 h-4 text-green-500" />
              <span>Success Rate</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {(metrics.successRate * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {Math.floor(metrics.successRate * metrics.totalIterations)}{" "}
              successful
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              <span>Training Sessions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {metrics.totalSessions}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {liveStatus.sessionActive
                ? "Session active"
                : "No active session"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span>Training Time</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {formatDuration(metrics.totalTrainingTime)}
            </div>
            <div className="text-sm text-gray-600 mt-1">Total time spent</div>
          </CardContent>
        </Card>
      </div>

      {/* Current Session */}
      {metrics.currentSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              <span>Current Training Session</span>
              <Badge className="bg-yellow-100 text-yellow-800">
                {metrics.currentSession.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600">Session ID</div>
                <div className="font-mono text-sm">
                  {metrics.currentSession.sessionId.split("_")[1]}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Started</div>
                <div className="text-sm">
                  {metrics.currentSession.startTime.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Duration</div>
                <div className="text-sm">
                  {formatDuration(
                    Date.now() - metrics.currentSession.startTime.getTime(),
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600">Iterations</div>
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.currentSession.totalIterations}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Completed</div>
                <div className="text-2xl font-bold text-green-600">
                  {metrics.currentSession.completedIterations}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Failed</div>
                <div className="text-2xl font-bold text-red-600">
                  {metrics.currentSession.failedIterations}
                </div>
              </div>
            </div>

            {metrics.currentSession.totalIterations > 0 && (
              <div>
                <div className="text-sm text-gray-600 mb-2">
                  Session Progress
                </div>
                <Progress
                  value={
                    (metrics.currentSession.completedIterations /
                      metrics.currentSession.totalIterations) *
                    100
                  }
                  className="w-full"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Iterations */}
      {metrics.recentIterations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-blue-500" />
              <span>Recent Training Iterations</span>
              <Badge className="bg-blue-100 text-blue-800">
                Last {metrics.recentIterations.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Real training data from actual ML API calls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.recentIterations
                .slice()
                .reverse()
                .map((iteration) => (
                  <div
                    key={iteration.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-lg font-bold text-gray-900">
                          #{iteration.iterationNumber}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {iteration.trainingType.replace(/_/g, " ")}
                          </div>
                          <div className="text-sm text-gray-600">
                            {iteration.dataPoints} data points •{" "}
                            {formatDuration(iteration.duration)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={`text-xs ${
                            iteration.status === "COMPLETED"
                              ? "bg-green-100 text-green-800"
                              : iteration.status === "FAILED"
                                ? "bg-red-100 text-red-800"
                                : iteration.status === "IN_PROGRESS"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {iteration.status}
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">
                          {iteration.timestamp.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {(iteration.accuracy ||
                      iteration.loss ||
                      iteration.validationAccuracy) && (
                      <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                        {iteration.accuracy && (
                          <div>
                            <span className="text-gray-600">Accuracy:</span>
                            <span className="ml-1 font-medium text-green-600">
                              {(iteration.accuracy * 100).toFixed(2)}%
                            </span>
                          </div>
                        )}
                        {iteration.loss && (
                          <div>
                            <span className="text-gray-600">Loss:</span>
                            <span className="ml-1 font-medium text-red-600">
                              {iteration.loss.toFixed(4)}
                            </span>
                          </div>
                        )}
                        {iteration.validationAccuracy && (
                          <div>
                            <span className="text-gray-600">Val Acc:</span>
                            <span className="ml-1 font-medium text-blue-600">
                              {(iteration.validationAccuracy * 100).toFixed(2)}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Model Improvements */}
      {metrics.modelImprovements.accuracyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span>Model Performance Trends</span>
            </CardTitle>
            <CardDescription>
              Accuracy improvements over training iterations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-2">Accuracy Trend</div>
                <div className="flex items-center space-x-2">
                  {metrics.modelImprovements.accuracyTrend
                    .slice(-10)
                    .map((accuracy, index) => (
                      <div
                        key={index}
                        className="flex-1 bg-gray-200 rounded-full h-2 relative"
                      >
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${accuracy * 100}%` }}
                        ></div>
                      </div>
                    ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Oldest</span>
                  <span>Latest</span>
                </div>
              </div>

              {metrics.modelImprovements.accuracyTrend.length >= 2 && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">First Accuracy:</span>
                    <span className="ml-2 font-medium">
                      {(
                        metrics.modelImprovements.accuracyTrend[0] * 100
                      ).toFixed(2)}
                      %
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Latest Accuracy:</span>
                    <span className="ml-2 font-medium">
                      {(
                        metrics.modelImprovements.accuracyTrend[
                          metrics.modelImprovements.accuracyTrend.length - 1
                        ] * 100
                      ).toFixed(2)}
                      %
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {metrics.totalIterations === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Training Data Yet
            </h3>
            <p className="text-gray-600 mb-4">
              Start a training session to begin tracking ML iterations
            </p>
            <Button
              onClick={handleStartTraining}
              className="flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>Start First Training Session</span>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
