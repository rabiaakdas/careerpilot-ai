namespace CareerPilot.Api.Dtos.Jobs;

public class ResumeJobMatchResponse
{
    public int MatchScore { get; set; }

    public string Summary { get; set; } = string.Empty;

    public List<string> MatchedSkills { get; set; } = [];

    public List<string> MissingSkills { get; set; } = [];

    public List<string> Strengths { get; set; } = [];

    public List<string> Recommendations { get; set; } = [];
}
