using CareerPilot.Api.Dtos.Jobs;

namespace CareerPilot.Api.Services.AI;

public interface ISkillGapAnalysisService
{
    Task<SkillGapAnalysisResponse> AnalyzeAsync(
        string jobDescription,
        string resumeText,
        CancellationToken cancellationToken);
}
