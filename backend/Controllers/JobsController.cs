using System.Security.Claims;
using CareerPilot.Api.Data;
using CareerPilot.Api.Dtos.Jobs;
using CareerPilot.Api.Models;
using CareerPilot.Api.Services.AI;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CareerPilot.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/jobs")]
public class JobsController(
    CareerPilotDbContext dbContext,
    IJobAnalysisService jobAnalysisService) : ControllerBase
{
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
