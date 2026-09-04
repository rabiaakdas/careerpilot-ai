using System.Security.Claims;
using CareerPilot.Api.Data;
using CareerPilot.Api.Dtos.Dashboard;
using CareerPilot.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CareerPilot.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/dashboard")]
public class DashboardController(CareerPilotDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var totalJobs = await dbContext.Jobs
            .AsNoTracking()
            .CountAsync(job => job.UserId == userId.Value, cancellationToken);

        var totalApplications = await dbContext.Applications
            .AsNoTracking()
            .CountAsync(application => application.UserId == userId.Value, cancellationToken);

        var statusCounts = await dbContext.Applications
            .AsNoTracking()
            .Where(application => application.UserId == userId.Value)
            .GroupBy(application => application.Status)
            .ToDictionaryAsync(
                group => group.Key,
                group => group.Count(),
                cancellationToken);

        var recentApplications = await dbContext.Applications
            .AsNoTracking()
            .Where(application => application.UserId == userId.Value)
            .OrderByDescending(application => application.UpdatedAt ?? application.CreatedAt)
            .Select(application => new RecentApplicationResponse
            {
                Id = application.Id,
                JobId = application.JobId,
                CompanyName = application.Job != null ? application.Job.CompanyName : string.Empty,
                PositionTitle = application.Job != null ? application.Job.PositionTitle : string.Empty,
                Status = application.Status.ToString(),
                AppliedAt = application.AppliedAt,
                CreatedAt = application.CreatedAt,
                UpdatedAt = application.UpdatedAt
            })
            .Take(5)
            .ToListAsync(cancellationToken);

        var applicationsByStatus = new ApplicationStatusDistributionResponse
        {
            Applied = GetStatusCount(statusCounts, ApplicationStatus.Applied),
            Interview = GetStatusCount(statusCounts, ApplicationStatus.Interview),
            Offer = GetStatusCount(statusCounts, ApplicationStatus.Offer),
            Rejected = GetStatusCount(statusCounts, ApplicationStatus.Rejected),
            Withdrawn = GetStatusCount(statusCounts, ApplicationStatus.Withdrawn)
        };

        var response = new DashboardResponse
        {
            TotalJobs = totalJobs,
            TotalApplications = totalApplications,
            ApplicationsByStatus = applicationsByStatus,
            ApplicationRate = totalJobs > 0
                ? Math.Round((double)totalApplications / totalJobs * 100, 2)
                : 0,
            RecentApplications = recentApplications
        };

        return Ok(response);
    }

    private Guid? GetCurrentUserId()
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);

        return Guid.TryParse(userIdValue, out var userId) ? userId : null;
    }

    private static int GetStatusCount(
        IReadOnlyDictionary<ApplicationStatus, int> statusCounts,
        ApplicationStatus status)
    {
        return statusCounts.TryGetValue(status, out var count) ? count : 0;
    }
}
