namespace CareerPilot.Api.Dtos.Jobs;

public class SkillGapAnalysisResponse
{
    public string OverallGapLevel { get; set; } = string.Empty;

    public List<SkillGapItem> SkillGaps { get; set; } = [];
}

public class SkillGapItem
{
    public string Skill { get; set; } = string.Empty;

    public string Priority { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;

    public string CurrentEvidence { get; set; } = string.Empty;

    public string RecommendedAction { get; set; } = string.Empty;
}
