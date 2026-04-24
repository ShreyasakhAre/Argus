"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface AIErrorFallbackProps {
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function AIErrorFallback({ onRetry, isRetrying = false }: AIErrorFallbackProps) {
  return (
    <Alert className="border-yellow-200 bg-yellow-50">
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800">AI Service Status</AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="text-yellow-700">
          AI service temporarily unavailable. Using fallback detection.
        </p>
        <p className="text-sm text-yellow-600">
          The system is still analyzing messages using advanced rule-based detection.
        </p>
        {onRetry && (
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              disabled={isRetrying}
              className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry AI Analysis
                </>
              )}
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function getAIErrorMessage(error: any): string {
  if (!error) return "Unknown error occurred";
  
  const message = error.message || error.toString();
  
  // Handle specific API errors
  if (message.includes("402") || message.includes("insufficient_credits")) {
    return "AI service credits insufficient. Using fallback detection.";
  }
  
  if (message.includes("timeout")) {
    return "AI service timeout. Using fallback detection.";
  }
  
  if (message.includes("network") || message.includes("fetch")) {
    return "AI service network error. Using fallback detection.";
  }
  
  if (message.includes("503") || message.includes("unavailable")) {
    return "AI service temporarily unavailable. Using fallback detection.";
  }
  
  // Generic fallback
  return "AI service temporarily unavailable. Using fallback detection.";
}

export function isAIServiceError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message || error.toString();
  return message.includes("402") || 
         message.includes("insufficient_credits") ||
         message.includes("AI") ||
         message.includes("timeout") ||
         message.includes("network") ||
         message.includes("503");
}
