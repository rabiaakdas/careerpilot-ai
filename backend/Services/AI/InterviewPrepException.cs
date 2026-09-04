namespace CareerPilot.Api.Services.AI;

public enum InterviewPrepErrorType
{
    MissingConfiguration,
    ProviderError,
    Timeout,
    InvalidResponse
}

public class InterviewPrepException(
    InterviewPrepErrorType errorType,
    string message) : Exception(message)
{
    public InterviewPrepErrorType ErrorType { get; } = errorType;
}
