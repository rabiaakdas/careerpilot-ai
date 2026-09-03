namespace CareerPilot.Api.Services.AI;

public enum SkillGapAnalysisErrorType
{
    MissingConfiguration,
    ProviderError,
    Timeout,
    InvalidResponse
}

public class SkillGapAnalysisException(
    SkillGapAnalysisErrorType errorType,
    string message) : Exception(message)
{
    public SkillGapAnalysisErrorType ErrorType { get; } = errorType;
}
