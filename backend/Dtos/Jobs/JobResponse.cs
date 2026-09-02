namespace CareerPilot.Api.Dtos.Jobs;

public class JobResponse
{
    public Guid Id { get; set; }

    public string CompanyName { get; set; } = string.Empty;

    public string PositionTitle { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string? Location { get; set; }

    public string? JobUrl { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
