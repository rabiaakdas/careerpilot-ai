using System.Security.Claims;
using CareerPilot.Api.Data;
using CareerPilot.Api.Dtos.Applications;
using CareerPilot.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace CareerPilot.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/applications")]
public class ApplicationsController(CareerPilotDbContext dbContext) : ControllerBase
{
    private const int MaxNotesLength = 2000;

    [HttpPost]
    public async Task<IActionResult> Create(CreateApplicationRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        ValidateCreateRequest(request);

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var job = await dbContext.Jobs
            .FirstOrDefaultAsync(job => job.Id == request.JobId && job.UserId == userId.Value, cancellationToken);

        if (job is null)
        {
            return NotFound(new { message = "Job was not found." });
        }

        var applicationExists = await dbContext.Applications
            .AnyAsync(application =>
                application.UserId == userId.Value && application.JobId == request.JobId,
                cancellationToken);

        if (applicationExists)
        {
            return Conflict(new { message = "An application already exists for this job." });
        }

        var application = new Application
        {
            Id = Guid.NewGuid(),
            UserId = userId.Value,
            JobId = request.JobId,
            Status = request.Status ?? ApplicationStatus.Applied,
            AppliedAt = request.AppliedAt ?? DateTime.UtcNow,
            Notes = NormalizeOptionalText(request.Notes),
            CreatedAt = DateTime.UtcNow,
            Job = job
        };

        dbContext.Applications.Add(application);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (IsUniqueViolation(exception))
        {
            return Conflict(new { message = "An application already exists for this job." });
        }

        return CreatedAtAction(nameof(GetById), new { id = application.Id }, ToResponse(application));
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var applications = await dbContext.Applications
            .Where(application => application.UserId == userId.Value)
            .Include(application => application.Job)
            .OrderByDescending(application => application.AppliedAt)
            .Select(application => ToResponse(application))
            .ToListAsync(cancellationToken);

        return Ok(applications);
    }

    [HttpGet("kanban")]
    public async Task<IActionResult> GetKanban(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var applications = await dbContext.Applications
            .Where(application => application.UserId == userId.Value)
            .OrderByDescending(application => application.UpdatedAt ?? application.CreatedAt)
            .Select(application => new ApplicationKanbanItemResponse
            {
                Id = application.Id,
                JobId = application.JobId,
                CompanyName = application.Job != null ? application.Job.CompanyName : string.Empty,
                PositionTitle = application.Job != null ? application.Job.PositionTitle : string.Empty,
                Status = application.Status.ToString(),
                AppliedAt = application.AppliedAt,
                Notes = application.Notes,
                CreatedAt = application.CreatedAt,
                UpdatedAt = application.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        var response = new ApplicationKanbanResponse
        {
            Applied = applications.Where(application => application.Status == nameof(ApplicationStatus.Applied)).ToList(),
            Interview = applications.Where(application => application.Status == nameof(ApplicationStatus.Interview)).ToList(),
            Offer = applications.Where(application => application.Status == nameof(ApplicationStatus.Offer)).ToList(),
            Rejected = applications.Where(application => application.Status == nameof(ApplicationStatus.Rejected)).ToList(),
            Withdrawn = applications.Where(application => application.Status == nameof(ApplicationStatus.Withdrawn)).ToList()
        };

        return Ok(response);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var application = await dbContext.Applications
            .Include(application => application.Job)
            .FirstOrDefaultAsync(application =>
                application.Id == id && application.UserId == userId.Value,
                cancellationToken);

        if (application is null)
        {
            return NotFound();
        }

        return Ok(ToResponse(application));
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(
        Guid id,
        ApplicationStatusUpdateRequest? request,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        if (request is null)
        {
            ModelState.AddModelError(nameof(ApplicationStatusUpdateRequest), "Request body is required.");
            return ValidationProblem(ModelState);
        }

        if (!TryParseApplicationStatus(request.Status, out var status))
        {
            ModelState.AddModelError(nameof(ApplicationStatusUpdateRequest.Status), "Status is invalid.");
            return ValidationProblem(ModelState);
        }

        var application = await dbContext.Applications
            .Include(application => application.Job)
            .FirstOrDefaultAsync(application =>
                application.Id == id && application.UserId == userId.Value,
                cancellationToken);

        if (application is null)
        {
            return NotFound();
        }

        if (application.Status != status)
        {
            application.Status = status;
            application.UpdatedAt = DateTime.UtcNow;

            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return Ok(ToResponse(application));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateApplicationRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        ValidateUpdateRequest(request);

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var application = await dbContext.Applications
            .Include(application => application.Job)
            .FirstOrDefaultAsync(application =>
                application.Id == id && application.UserId == userId.Value,
                cancellationToken);

        if (application is null)
        {
            return NotFound();
        }

        application.Status = request.Status!.Value;
        application.AppliedAt = request.AppliedAt!.Value;
        application.Notes = NormalizeOptionalText(request.Notes);
        application.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(application));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var application = await dbContext.Applications
            .FirstOrDefaultAsync(application =>
                application.Id == id && application.UserId == userId.Value,
                cancellationToken);

        if (application is null)
        {
            return NotFound();
        }

        dbContext.Applications.Remove(application);
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private Guid? GetCurrentUserId()
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);

        return Guid.TryParse(userIdValue, out var userId) ? userId : null;
    }

    private void ValidateCreateRequest(CreateApplicationRequest request)
    {
        if (request.JobId == Guid.Empty)
        {
            ModelState.AddModelError(nameof(CreateApplicationRequest.JobId), "Job id is required.");
        }

        if (request.Status.HasValue && !Enum.IsDefined(request.Status.Value))
        {
            ModelState.AddModelError(nameof(CreateApplicationRequest.Status), "Status is invalid.");
        }

        ValidateAppliedAt(request.AppliedAt);
        ValidateNotes(request.Notes);
    }

    private void ValidateUpdateRequest(UpdateApplicationRequest request)
    {
        if (!request.Status.HasValue)
        {
            ModelState.AddModelError(nameof(UpdateApplicationRequest.Status), "Status is required.");
        }
        else if (!Enum.IsDefined(request.Status.Value))
        {
            ModelState.AddModelError(nameof(UpdateApplicationRequest.Status), "Status is invalid.");
        }

        if (!request.AppliedAt.HasValue)
        {
            ModelState.AddModelError(nameof(UpdateApplicationRequest.AppliedAt), "Applied date is required.");
        }
        else
        {
            ValidateAppliedAt(request.AppliedAt);
        }

        ValidateNotes(request.Notes);
    }

    private void ValidateAppliedAt(DateTime? appliedAt)
    {
        if (appliedAt.HasValue && appliedAt.Value > DateTime.UtcNow.AddDays(1))
        {
            ModelState.AddModelError("AppliedAt", "Applied date cannot be in the future.");
        }
    }

    private void ValidateNotes(string? notes)
    {
        if (notes?.Length > MaxNotesLength)
        {
            ModelState.AddModelError("Notes", $"Notes must be {MaxNotesLength} characters or fewer.");
        }
    }

    private static bool IsUniqueViolation(DbUpdateException exception)
    {
        return exception.InnerException is PostgresException postgresException
            && postgresException.SqlState == PostgresErrorCodes.UniqueViolation;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        var trimmedValue = value?.Trim();

        return string.IsNullOrWhiteSpace(trimmedValue) ? null : trimmedValue;
    }

    private static bool TryParseApplicationStatus(string? value, out ApplicationStatus status)
    {
        status = default;

        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        return Enum.TryParse(value.Trim(), ignoreCase: true, out status)
            && Enum.IsDefined(status);
    }

    private static ApplicationResponse ToResponse(Application application)
    {
        return new ApplicationResponse
        {
            Id = application.Id,
            JobId = application.JobId,
            Status = application.Status,
            AppliedAt = application.AppliedAt,
            Notes = application.Notes,
            CreatedAt = application.CreatedAt,
            UpdatedAt = application.UpdatedAt,
            CompanyName = application.Job?.CompanyName ?? string.Empty,
            PositionTitle = application.Job?.PositionTitle ?? string.Empty
        };
    }
}
