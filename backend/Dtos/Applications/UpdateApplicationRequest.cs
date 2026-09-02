using CareerPilot.Api.Models;

namespace CareerPilot.Api.Dtos.Applications;

public class UpdateApplicationRequest
{
    public ApplicationStatus? Status { get; set; }

    public DateTime? AppliedAt { get; set; }

    public string? Notes { get; set; }
}
