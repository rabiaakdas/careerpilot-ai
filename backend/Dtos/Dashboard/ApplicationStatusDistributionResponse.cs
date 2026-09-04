namespace CareerPilot.Api.Dtos.Dashboard;

public class ApplicationStatusDistributionResponse
{
    public int Applied { get; set; }

    public int Interview { get; set; }

    public int Offer { get; set; }

    public int Rejected { get; set; }

    public int Withdrawn { get; set; }
}
