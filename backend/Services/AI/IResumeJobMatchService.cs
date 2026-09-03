using CareerPilot.Api.Dtos.Jobs;

namespace CareerPilot.Api.Services.AI;

public interface IResumeJobMatchService
{
    Task<ResumeJobMatchResponse> MatchAsync(
        string jobDescription,
        string resumeText,
        CancellationToken cancellationToken);
}
