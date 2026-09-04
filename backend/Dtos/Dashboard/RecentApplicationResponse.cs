namespace CareerPilot.Api.Dtos.Dashboard;

public class RecentApplicationResponse
{
    public Guid Id { get; set; }

    public Guid JobId { get; set; }

    public string CompanyName { get; set; } = string.Empty;

    public string PositionTitle { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public DateTime? AppliedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
