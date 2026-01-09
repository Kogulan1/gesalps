/**
 * Utility functions for converting technical error messages to user-friendly messages
 */

export function getUserFriendlyErrorMessage(error: string | Error | null | undefined): string {
  if (!error) {
    return "An unexpected error occurred. Please try again.";
  }

  const errorMessage = typeof error === 'string' ? error : error.message || 'Unknown error';

  // Network/Connection errors
  if (errorMessage.includes('Failed to fetch') || 
      errorMessage.includes('NetworkError') ||
      errorMessage.includes('Network request failed')) {
    return "Unable to connect to the server. Please check your internet connection and try again.";
  }

  if (errorMessage.includes('Cannot connect to backend') ||
      errorMessage.includes('Network error')) {
    return "Unable to connect to the server. The service may be temporarily unavailable. Please try again in a few moments.";
  }

  // CORS errors
  if (errorMessage.includes('CORS') || 
      errorMessage.includes('Access-Control-Allow-Origin')) {
    return "Connection blocked by security settings. Please contact support if this issue persists.";
  }

  // Authentication errors
  if (errorMessage.includes('401') || 
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Authentication expired') ||
      errorMessage.includes('No authentication token')) {
    return "Your session has expired. Please sign in again.";
  }

  // Permission errors
  if (errorMessage.includes('403') || 
      errorMessage.includes('Forbidden')) {
    return "You don't have permission to perform this action. Please contact your administrator.";
  }

  // Not found errors
  if (errorMessage.includes('404') || 
      errorMessage.includes('Not found') ||
      errorMessage.includes('Project not found') ||
      errorMessage.includes('Dataset not found') ||
      errorMessage.includes('Run not found')) {
    return "The requested item could not be found. It may have been deleted or moved.";
  }

  // Server errors
  if (errorMessage.includes('500') || 
      errorMessage.includes('Internal Server Error')) {
    return "A server error occurred. Our team has been notified. Please try again later.";
  }

  // Timeout errors
  if (errorMessage.includes('timeout') || 
      errorMessage.includes('Timeout')) {
    return "The request took too long to complete. Please try again.";
  }

  // Generic API errors
  if (errorMessage.includes('API error') || 
      errorMessage.includes('HTTP')) {
    return "An error occurred while processing your request. Please try again.";
  }

  // Backend configuration errors
  if (errorMessage.includes('Backend API URL not configured') ||
      errorMessage.includes('NEXT_PUBLIC_BACKEND_API_BASE')) {
    return "Service configuration error. Please contact support.";
  }

  // If it's already a user-friendly message, return as-is
  if (!errorMessage.includes('Error:') && 
      !errorMessage.includes('Failed') &&
      !errorMessage.includes('HTTP') &&
      errorMessage.length < 100) {
    return errorMessage;
  }

  // Default fallback
  return "Something went wrong. Please try again or contact support if the problem persists.";
}

