namespace CareerPilot.Api.Dtos.Applications;

public class ApplicationKanbanItemResponse
{
    public Guid Id { get; set; }

    public Guid JobId { get; set; }

    public string CompanyName { get; set; } = string.Empty;

    public string PositionTitle { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public DateTime? AppliedAt { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
