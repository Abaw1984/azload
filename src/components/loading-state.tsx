import React from "react";
import { Loader2, Building, Brain, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface LoadingStateProps {
  title?: string;
  message?: string;
  progress?: number;
  showProgress?: boolean;
  icon?: "building" | "brain" | "eye" | "loader";
  size?: "sm" | "md" | "lg";
}

function LoadingState({
  title = "Loading...",
  message = "Please wait while we process your request.",
  progress,
  showProgress = false,
  icon = "loader",
  size = "md",
}: LoadingStateProps) {
  const getIcon = () => {
    const iconClass =
      size === "sm" ? "w-6 h-6" : size === "lg" ? "w-12 h-12" : "w-8 h-8";
    const animateClass = "animate-spin";

    switch (icon) {
      case "building":
        return <Building className={`${iconClass} text-blue-600`} />;
      case "brain":
        return (
          <Brain className={`${iconClass} text-purple-600 ${animateClass}`} />
        );
      case "eye":
        return <Eye className={`${iconClass} text-green-600`} />;
      default:
        return (
          <Loader2 className={`${iconClass} text-blue-600 ${animateClass}`} />
        );
    }
  };

  const getContainerClass = () => {
    switch (size) {
      case "sm":
        return "min-h-[200px] p-4";
      case "lg":
        return "min-h-[600px] p-8";
      default:
        return "min-h-[400px] p-6";
    }
  };

  const getTitleClass = () => {
    switch (size) {
      case "sm":
        return "text-base font-medium";
      case "lg":
        return "text-xl font-semibold";
      default:
        return "text-lg font-medium";
    }
  };

  const getMessageClass = () => {
    switch (size) {
      case "sm":
        return "text-sm";
      case "lg":
        return "text-base";
      default:
        return "text-sm";
    }
  };

  return (
    <div
      className={`flex items-center justify-center bg-white ${getContainerClass()}`}
    >
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center space-y-4 p-6">
          <div className="flex items-center justify-center">{getIcon()}</div>

          <div className="text-center space-y-2">
            <h3 className={`text-gray-900 ${getTitleClass()}`}>{title}</h3>
            <p className={`text-gray-600 ${getMessageClass()}`}>{message}</p>
          </div>

          {showProgress && (
            <div className="w-full space-y-2">
              <Progress value={progress || 0} className="w-full" />
              {typeof progress === "number" && (
                <div className="text-center text-xs text-gray-500">
                  {Math.round(progress)}% complete
                </div>
              )}
            </div>
          )}

          <div className="flex items-center space-x-1 text-xs text-gray-400">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div
              className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
              style={{ animationDelay: "0.2s" }}
            ></div>
            <div
              className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
              style={{ animationDelay: "0.4s" }}
            ></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoadingState;
