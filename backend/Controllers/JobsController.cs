using System.Security.Claims;
using CareerPilot.Api.Data;
using CareerPilot.Api.Dtos.Jobs;
using CareerPilot.Api.Models;
using CareerPilot.Api.Services.AI;
using CareerPilot.Api.Services.Resumes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CareerPilot.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/jobs")]
public class JobsController(
    CareerPilotDbContext dbContext,
    IJobAnalysisService jobAnalysisService,
    IResumeJobMatchService resumeJobMatchService,
    ISkillGapAnalysisService skillGapAnalysisService,
    ILearningRoadmapService learningRoadmapService,
    IResumeTextExtractor resumeTextExtractor,
    IWebHostEnvironment environment,
    ILogger<JobsController> logger) : ControllerBase
{
    private const string UploadsDirectory = "uploads";
    private const string ResumesDirectory = "resumes";

    [HttpPost]
    public async Task<IActionResult> Create(CreateJobRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var companyName = request.CompanyName?.Trim();
        var positionTitle = request.PositionTitle?.Trim();
        var description = request.Description?.Trim();
        var location = NormalizeOptionalText(request.Location);
        var jobUrl = NormalizeOptionalText(request.JobUrl);

        ValidateJobRequest(companyName, positionTitle, description);

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var job = new Job
        {
            Id = Guid.NewGuid(),
            UserId = userId.Value,
            CompanyName = companyName!,
            PositionTitle = positionTitle!,
            Description = description!,
            Location = location,
            JobUrl = jobUrl,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.Jobs.Add(job);
        await dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = job.Id }, ToResponse(job));
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var jobs = await dbContext.Jobs
            .Where(job => job.UserId == userId.Value)
            .OrderByDescending(job => job.CreatedAt)
            .Select(job => ToResponse(job))
            .ToListAsync(cancellationToken);

        return Ok(jobs);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var job = await dbContext.Jobs
            .FirstOrDefaultAsync(job => job.Id == id && job.UserId == userId.Value, cancellationToken);

        if (job is null)
        {
            return NotFound();
        }

        return Ok(ToResponse(job));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateJobRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var job = await dbContext.Jobs
            .FirstOrDefaultAsync(job => job.Id == id && job.UserId == userId.Value, cancellationToken);

        if (job is null)
        {
            return NotFound();
        }

        var companyName = request.CompanyName?.Trim();
        var positionTitle = request.PositionTitle?.Trim();
        var description = request.Description?.Trim();

        ValidateJobRequest(companyName, positionTitle, description);

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        job.CompanyName = companyName!;
        job.PositionTitle = positionTitle!;
        job.Description = description!;
        job.Location = NormalizeOptionalText(request.Location);
        job.JobUrl = NormalizeOptionalText(request.JobUrl);
        job.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(job));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var job = await dbContext.Jobs
            .FirstOrDefaultAsync(job => job.Id == id && job.UserId == userId.Value, cancellationToken);

        if (job is null)
        {
            return NotFound();
        }

        dbContext.Jobs.Remove(job);
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpPost("{id:guid}/analyze")]
    public async Task<IActionResult> Analyze(Guid id, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var job = await dbContext.Jobs
            .FirstOrDefaultAsync(job => job.Id == id && job.UserId == userId.Value, cancellationToken);

        if (job is null)
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(job.Description))
        {
            ModelState.AddModelError(nameof(Job.Description), "Job description is required for analysis.");
            return ValidationProblem(ModelState);
        }

        try
        {
            var analysis = await jobAnalysisService.AnalyzeAsync(job.Description, cancellationToken);
            return Ok(analysis);
        }
        catch (JobAnalysisException exception)
        {
            return ToJobAnalysisErrorResponse(exception);
        }
    }

    [HttpPost("{id:guid}/match")]
    public async Task<IActionResult> Match(Guid id, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var job = await dbContext.Jobs
            .FirstOrDefaultAsync(job => job.Id == id && job.UserId == userId.Value, cancellationToken);

        if (job is null)
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(job.Description))
        {
            ModelState.AddModelError(nameof(Job.Description), "Job description is required for matching.");
            return ValidationProblem(ModelState);
        }

        var resume = await dbContext.Resumes
            .FirstOrDefaultAsync(resume => resume.UserId == userId.Value, cancellationToken);

        if (resume is null)
        {
            return NotFound(new { message = "Resume not found." });
        }

        var fullPath = GetStoredResumeFileFullPath(resume.FilePath);

        if (fullPath is null || !System.IO.File.Exists(fullPath))
        {
            logger.LogError("Resume file is missing or outside the uploads directory for resume {ResumeId}.", resume.Id);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { message = "Resume file is missing on the server." });
        }

        string resumeText;

        try
        {
            resumeText = await resumeTextExtractor.ExtractTextAsync(
                fullPath,
                resume.ContentType,
                cancellationToken);
        }
        catch (ResumeTextExtractionException exception)
        {
            logger.LogWarning(exception, "Resume text extraction failed for resume {ResumeId}.", resume.Id);

            return ToResumeTextExtractionErrorResponse(exception);
        }

        try
        {
            var match = await resumeJobMatchService.MatchAsync(
                job.Description,
                resumeText,
                cancellationToken);

            return Ok(match);
        }
        catch (ResumeJobMatchException exception)
        {
            return ToResumeJobMatchErrorResponse(exception);
        }
    }

    [HttpPost("{id:guid}/skill-gap")]
    public async Task<IActionResult> AnalyzeSkillGap(Guid id, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var job = await dbContext.Jobs
            .FirstOrDefaultAsync(job => job.Id == id && job.UserId == userId.Value, cancellationToken);

        if (job is null)
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(job.Description))
        {
            ModelState.AddModelError(nameof(Job.Description), "Job description is required for skill gap analysis.");
            return ValidationProblem(ModelState);
        }

        var resume = await dbContext.Resumes
            .FirstOrDefaultAsync(resume => resume.UserId == userId.Value, cancellationToken);

        if (resume is null)
        {
            return NotFound(new { message = "Resume not found." });
        }

        var fullPath = GetStoredResumeFileFullPath(resume.FilePath);

        if (fullPath is null || !System.IO.File.Exists(fullPath))
        {
            logger.LogError("Resume file is missing or outside the uploads directory for resume {ResumeId}.", resume.Id);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { message = "Resume file is missing on the server." });
        }

        string resumeText;

        try
        {
            resumeText = await resumeTextExtractor.ExtractTextAsync(
                fullPath,
                resume.ContentType,
                cancellationToken);
        }
        catch (ResumeTextExtractionException exception)
        {
            logger.LogWarning(exception, "Resume text extraction failed for resume {ResumeId}.", resume.Id);

            return ToResumeTextExtractionErrorResponse(exception);
        }

        try
        {
            var analysis = await skillGapAnalysisService.AnalyzeAsync(
                job.Description,
                resumeText,
                cancellationToken);

            return Ok(analysis);
        }
        catch (SkillGapAnalysisException exception)
        {
            return ToSkillGapAnalysisErrorResponse(exception);
        }
    }

    [HttpPost("{id:guid}/learning-roadmap")]
    public async Task<IActionResult> CreateLearningRoadmap(Guid id, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var job = await dbContext.Jobs
            .FirstOrDefaultAsync(job => job.Id == id && job.UserId == userId.Value, cancellationToken);

        if (job is null)
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(job.Description))
        {
            ModelState.AddModelError(nameof(Job.Description), "Job description is required for learning roadmap.");
            return ValidationProblem(ModelState);
        }

        var resume = await dbContext.Resumes
            .FirstOrDefaultAsync(resume => resume.UserId == userId.Value, cancellationToken);

        if (resume is null)
        {
            return NotFound(new { message = "Resume not found." });
        }

        var fullPath = GetStoredResumeFileFullPath(resume.FilePath);

        if (fullPath is null || !System.IO.File.Exists(fullPath))
        {
            logger.LogError("Resume file is missing or outside the uploads directory for resume {ResumeId}.", resume.Id);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { message = "Resume file is missing on the server." });
        }

        string resumeText;

        try
        {
            resumeText = await resumeTextExtractor.ExtractTextAsync(
                fullPath,
                resume.ContentType,
                cancellationToken);
        }
        catch (ResumeTextExtractionException exception)
        {
            logger.LogWarning(exception, "Resume text extraction failed for resume {ResumeId}.", resume.Id);

            return ToResumeTextExtractionErrorResponse(exception);
        }

        try
        {
            var roadmap = await learningRoadmapService.CreateAsync(
                job.Description,
                resumeText,
                cancellationToken);

            return Ok(roadmap);
        }
        catch (LearningRoadmapException exception)
        {
            return ToLearningRoadmapErrorResponse(exception);
        }
    }

    private Guid? GetCurrentUserId()
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);

        return Guid.TryParse(userIdValue, out var userId) ? userId : null;
    }

    private void ValidateJobRequest(string? companyName, string? positionTitle, string? description)
    {
        if (string.IsNullOrWhiteSpace(companyName))
        {
            ModelState.AddModelError(nameof(CreateJobRequest.CompanyName), "Company name is required.");
        }
        else if (companyName.Length > 200)
        {
            ModelState.AddModelError(nameof(CreateJobRequest.CompanyName), "Company name must be 200 characters or fewer.");
        }

        if (string.IsNullOrWhiteSpace(positionTitle))
        {
            ModelState.AddModelError(nameof(CreateJobRequest.PositionTitle), "Position title is required.");
        }
        else if (positionTitle.Length > 200)
        {
            ModelState.AddModelError(nameof(CreateJobRequest.PositionTitle), "Position title must be 200 characters or fewer.");
        }

        if (string.IsNullOrWhiteSpace(description))
        {
            ModelState.AddModelError(nameof(CreateJobRequest.Description), "Description is required.");
        }
        else if (description.Length > 4000)
        {
            ModelState.AddModelError(nameof(CreateJobRequest.Description), "Description must be 4000 characters or fewer.");
        }
    }

    private static string? NormalizeOptionalText(string? value)
    {
        var trimmedValue = value?.Trim();

        return string.IsNullOrWhiteSpace(trimmedValue) ? null : trimmedValue;
    }

    private IActionResult ToJobAnalysisErrorResponse(JobAnalysisException exception)
    {
        return exception.ErrorType switch
        {
            JobAnalysisErrorType.MissingConfiguration => StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new { message = "AI analysis is not configured." }),
            JobAnalysisErrorType.ProviderError => StatusCode(
                StatusCodes.Status502BadGateway,
                new { message = "AI provider could not complete the analysis." }),
            JobAnalysisErrorType.Timeout => StatusCode(
                StatusCodes.Status504GatewayTimeout,
                new { message = "AI analysis timed out." }),
            JobAnalysisErrorType.InvalidResponse => StatusCode(
                StatusCodes.Status502BadGateway,
                new { message = "AI provider returned an invalid analysis response." }),
            _ => StatusCode(
                StatusCodes.Status502BadGateway,
                new { message = "AI analysis failed." })
        };
    }

    private IActionResult ToResumeJobMatchErrorResponse(ResumeJobMatchException exception)
    {
        return exception.ErrorType switch
        {
            ResumeJobMatchErrorType.MissingConfiguration => StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new { message = "AI match is not configured." }),
            ResumeJobMatchErrorType.ProviderError => StatusCode(
                StatusCodes.Status502BadGateway,
                new { message = "AI provider could not complete the match." }),
            ResumeJobMatchErrorType.Timeout => StatusCode(
                StatusCodes.Status504GatewayTimeout,
                new { message = "AI match timed out." }),
            ResumeJobMatchErrorType.InvalidResponse => StatusCode(
                StatusCodes.Status502BadGateway,
                new { message = "AI provider returned an invalid match response." }),
            _ => StatusCode(
                StatusCodes.Status502BadGateway,
                new { message = "AI match failed." })
        };
    }

    private IActionResult ToSkillGapAnalysisErrorResponse(SkillGapAnalysisException exception)
    {
        return exception.ErrorType switch
        {
            SkillGapAnalysisErrorType.MissingConfiguration => StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new { message = "AI skill gap analysis is not configured." }),
            SkillGapAnalysisErrorType.ProviderError => StatusCode(
                StatusCodes.Status502BadGateway,
                new { message = "AI provider could not complete the skill gap analysis." }),
            SkillGapAnalysisErrorType.Timeout => StatusCode(
                StatusCodes.Status504GatewayTimeout,
                new { message = "AI skill gap analysis timed out." }),
            SkillGapAnalysisErrorType.InvalidResponse => StatusCode(
                StatusCodes.Status502BadGateway,
                new { message = "AI provider returned an invalid skill gap analysis response." }),
            _ => StatusCode(
                StatusCodes.Status502BadGateway,
                new { message = "AI skill gap analysis failed." })
        };
    }

    private IActionResult ToLearningRoadmapErrorResponse(LearningRoadmapException exception)
    {
        return exception.ErrorType switch
        {
            LearningRoadmapErrorType.MissingConfiguration => StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new { message = "AI learning roadmap is not configured." }),
            LearningRoadmapErrorType.ProviderError => StatusCode(
                StatusCodes.Status502BadGateway,
                new { message = "AI provider could not complete the learning roadmap." }),
            LearningRoadmapErrorType.Timeout => StatusCode(
                StatusCodes.Status504GatewayTimeout,
                new { message = "AI learning roadmap timed out." }),
            LearningRoadmapErrorType.InvalidResponse => StatusCode(
                StatusCodes.Status502BadGateway,
                new { message = "AI provider returned an invalid learning roadmap response." }),
            _ => StatusCode(
                StatusCodes.Status502BadGateway,
                new { message = "AI learning roadmap failed." })
        };
    }

    private IActionResult ToResumeTextExtractionErrorResponse(ResumeTextExtractionException exception)
    {
        return exception.ErrorType switch
        {
            ResumeTextExtractionErrorType.NoReadableText => UnprocessableEntity(new
            {
                message = "No readable text could be extracted from the resume."
            }),
            _ => UnprocessableEntity(new
            {
                message = "The resume file could not be read."
            })
        };
    }

    private string? GetStoredResumeFileFullPath(string relativeFilePath)
    {
        var uploadDirectory = Path.GetFullPath(
            Path.Combine(environment.ContentRootPath, UploadsDirectory, ResumesDirectory));
        var fullPath = Path.GetFullPath(Path.Combine(environment.ContentRootPath, relativeFilePath));

        return IsPathInsideDirectory(fullPath, uploadDirectory)
            ? fullPath
            : null;
    }

    private static bool IsPathInsideDirectory(string filePath, string directoryPath)
    {
        var directoryWithSeparator = directoryPath.EndsWith(Path.DirectorySeparatorChar)
            ? directoryPath
            : directoryPath + Path.DirectorySeparatorChar;

        return filePath.StartsWith(directoryWithSeparator, StringComparison.OrdinalIgnoreCase);
    }

    private static JobResponse ToResponse(Job job)
    {
        return new JobResponse
        {
            Id = job.Id,
            CompanyName = job.CompanyName,
            PositionTitle = job.PositionTitle,
            Description = job.Description,
            Location = job.Location,
            JobUrl = job.JobUrl,
            CreatedAt = job.CreatedAt,
            UpdatedAt = job.UpdatedAt
        };
    }
}
