namespace CareerPilot.Api.Dtos.Jobs;

public class JobAnalysisResponse
{
    public string Summary { get; set; } = string.Empty;

    public List<string> RequiredSkills { get; set; } = [];

    public List<string> PreferredSkills { get; set; } = [];

    public List<string> Technologies { get; set; } = [];

    public List<string> Responsibilities { get; set; } = [];

    public string ExperienceLevel { get; set; } = string.Empty;

    public List<string> EducationRequirements { get; set; } = [];

    public List<string> LanguageRequirements { get; set; } = [];

    public List<string> Keywords { get; set; } = [];
}
