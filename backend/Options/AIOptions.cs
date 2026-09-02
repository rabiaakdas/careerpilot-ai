namespace CareerPilot.Api.Options;

public class AIOptions
{
    public const string SectionName = "AI";

    public string ApiKey { get; set; } = string.Empty;

    public string Model { get; set; } = "gpt-5.6-luna";

    public string BaseUrl { get; set; } = "https://api.openai.com/v1/responses";

    public int TimeoutSeconds { get; set; } = 30;
}
