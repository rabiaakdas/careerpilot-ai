namespace CareerPilot.Api.Dtos.Jobs;

public class LearningRoadmapResponse
{
    public string Summary { get; set; } = string.Empty;

    public List<LearningRoadmapStep> Steps { get; set; } = [];
}

public class LearningRoadmapStep
{
    public int Order { get; set; }

    public string Skill { get; set; } = string.Empty;

    public string Priority { get; set; } = string.Empty;

    public string Goal { get; set; } = string.Empty;

    public List<string> Topics { get; set; } = [];

    public string PracticalTask { get; set; } = string.Empty;

    public string CompletionCriteria { get; set; } = string.Empty;
}
