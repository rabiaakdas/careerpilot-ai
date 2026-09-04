namespace CareerPilot.Api.Dtos.Applications;

public class ApplicationKanbanResponse
{
    public List<ApplicationKanbanItemResponse> Applied { get; set; } = [];

    public List<ApplicationKanbanItemResponse> Interview { get; set; } = [];

    public List<ApplicationKanbanItemResponse> Offer { get; set; } = [];

    public List<ApplicationKanbanItemResponse> Rejected { get; set; } = [];

    public List<ApplicationKanbanItemResponse> Withdrawn { get; set; } = [];
}
