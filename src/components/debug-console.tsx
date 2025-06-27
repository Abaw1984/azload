import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, Trash2, RefreshCw } from "lucide-react";

interface ConsoleLog {
  timestamp: string;
  level: "log" | "warn" | "error" | "info";
  message: string;
  data?: any;
}

function DebugConsole() {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [isCapturing, setIsCapturing] = useState(true);

  useEffect(() => {
    if (!isCapturing) return;

    // Capture console logs
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    const captureLog = (level: ConsoleLog["level"], args: any[]) => {
      const timestamp = new Date().toISOString();
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg),
        )
        .join(" ");

      setLogs((prev) =>
        [
          ...prev,
          {
            timestamp,
            level,
            message,
            data: args.length > 1 ? args.slice(1) : undefined,
          },
        ].slice(-500),
      ); // Keep last 500 logs
    };

    console.log = (...args) => {
      originalLog(...args);
      captureLog("log", args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      captureLog("warn", args);
    };

    console.error = (...args) => {
      originalError(...args);
      captureLog("error", args);
    };

    console.info = (...args) => {
      originalInfo(...args);
      captureLog("info", args);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      console.info = originalInfo;
    };
  }, [isCapturing]);

  const copyToClipboard = () => {
    const logText = logs
      .map(
        (log) =>
          `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`,
      )
      .join("\n");

    navigator.clipboard.writeText(logText).then(() => {
      alert("Console logs copied to clipboard!");
    });
  };

  const downloadLogs = () => {
    const logText = logs
      .map(
        (log) =>
          `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`,
      )
      .join("\n");

    const blob = new Blob([logText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `console-logs-${new Date().toISOString().slice(0, 19)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const getLogColor = (level: ConsoleLog["level"]) => {
    switch (level) {
      case "error":
        return "text-red-600 bg-red-50";
      case "warn":
        return "text-yellow-600 bg-yellow-50";
      case "info":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getBadgeVariant = (level: ConsoleLog["level"]) => {
    switch (level) {
      case "error":
        return "destructive" as const;
      case "warn":
        return "secondary" as const;
      case "info":
        return "default" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <Card className="w-full h-full bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Debug Console</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant={isCapturing ? "default" : "secondary"}>
              {isCapturing ? "Capturing" : "Paused"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCapturing(!isCapturing)}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              {isCapturing ? "Pause" : "Resume"}
            </Button>
          </div>
        </div>
        <div className="flex items-center space-x-2 mt-2">
          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            <Copy className="w-4 h-4 mr-1" />
            Copy All
          </Button>
          <Button variant="outline" size="sm" onClick={downloadLogs}>
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={clearLogs}>
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
          <Badge variant="outline">{logs.length} logs</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-96">
          <div className="p-4 space-y-2">
            {logs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No logs captured yet. Upload a file to see debug information.
              </div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`p-2 rounded text-xs font-mono border ${getLogColor(log.level)}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge
                      variant={getBadgeVariant(log.level)}
                      className="text-xs"
                    >
                      {log.level.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap break-words">
                    {log.message}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default DebugConsole;
