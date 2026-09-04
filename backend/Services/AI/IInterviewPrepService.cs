using CareerPilot.Api.Dtos.Jobs;

namespace CareerPilot.Api.Services.AI;

public interface IInterviewPrepService
{
    Task<InterviewPrepResponse> CreateAsync(
        string companyName,
        string positionTitle,
        string jobDescription,
        string resumeText,
        CancellationToken cancellationToken);
}
