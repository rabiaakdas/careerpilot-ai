namespace CareerPilot.Api.Models;

public class Job
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public required string CompanyName { get; set; }

    public required string PositionTitle { get; set; }

    public required string Description { get; set; }

    public string? Location { get; set; }

    public string? JobUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public User? User { get; set; }
}
