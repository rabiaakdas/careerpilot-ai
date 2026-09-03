namespace CareerPilot.Api.Services.Resumes;

public interface IResumeTextExtractor
{
    Task<string> ExtractTextAsync(
        string filePath,
        string contentType,
        CancellationToken cancellationToken = default);
}
