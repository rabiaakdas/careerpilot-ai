using CareerPilot.Api.Models;

namespace CareerPilot.Api.Dtos.Applications;

public class ApplicationResponse
{
    public Guid Id { get; set; }

    public Guid JobId { get; set; }

    public ApplicationStatus Status { get; set; }

    public DateTime AppliedAt { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public string CompanyName { get; set; } = string.Empty;

    public string PositionTitle { get; set; } = string.Empty;
}
