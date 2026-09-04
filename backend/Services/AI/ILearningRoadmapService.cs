using CareerPilot.Api.Dtos.Jobs;

namespace CareerPilot.Api.Services.AI;

public interface ILearningRoadmapService
{
    Task<LearningRoadmapResponse> CreateAsync(
        string jobDescription,
        string resumeText,
        CancellationToken cancellationToken);
}
