namespace CareerPilot.Api.Dtos.Jobs;

public class UpdateJobRequest
{
    public string? CompanyName { get; set; }

    public string? PositionTitle { get; set; }

    public string? Description { get; set; }

    public string? Location { get; set; }

    public string? JobUrl { get; set; }
}
