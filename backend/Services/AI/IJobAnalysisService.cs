using CareerPilot.Api.Dtos.Jobs;

namespace CareerPilot.Api.Services.AI;

public interface IJobAnalysisService
{
    Task<JobAnalysisResponse> AnalyzeAsync(string jobDescription, CancellationToken cancellationToken);
}
