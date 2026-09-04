namespace CareerPilot.Api.Services.AI;

public enum LearningRoadmapErrorType
{
    MissingConfiguration,
    ProviderError,
    Timeout,
    InvalidResponse
}

public class LearningRoadmapException(
    LearningRoadmapErrorType errorType,
    string message) : Exception(message)
{
    public LearningRoadmapErrorType ErrorType { get; } = errorType;
}
