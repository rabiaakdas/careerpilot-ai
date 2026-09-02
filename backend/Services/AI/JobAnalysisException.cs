namespace CareerPilot.Api.Services.AI;

public enum JobAnalysisErrorType
{
    MissingConfiguration,
    ProviderError,
    Timeout,
    InvalidResponse
}

public class JobAnalysisException(JobAnalysisErrorType errorType, string message) : Exception(message)
{
    public JobAnalysisErrorType ErrorType { get; } = errorType;
}
