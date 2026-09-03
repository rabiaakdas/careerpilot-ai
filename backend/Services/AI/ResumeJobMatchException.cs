namespace CareerPilot.Api.Services.AI;

public enum ResumeJobMatchErrorType
{
    MissingConfiguration,
    ProviderError,
    Timeout,
    InvalidResponse
}

public class ResumeJobMatchException(
    ResumeJobMatchErrorType errorType,
    string message) : Exception(message)
{
    public ResumeJobMatchErrorType ErrorType { get; } = errorType;
}
