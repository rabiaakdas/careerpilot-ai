using CareerPilot.Api.Models;

namespace CareerPilot.Api.Dtos.Applications;

public class CreateApplicationRequest
{
    public Guid JobId { get; set; }

    public ApplicationStatus? Status { get; set; }

    public DateTime? AppliedAt { get; set; }

    public string? Notes { get; set; }
}
