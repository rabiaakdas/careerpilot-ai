namespace CareerPilot.Api.Dtos.Dashboard;

public class DashboardResponse
{
    public int TotalJobs { get; set; }

    public int TotalApplications { get; set; }

    public ApplicationStatusDistributionResponse ApplicationsByStatus { get; set; } = new();

    public double ApplicationRate { get; set; }

    public List<RecentApplicationResponse> RecentApplications { get; set; } = [];
}
