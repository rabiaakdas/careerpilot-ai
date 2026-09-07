namespace CareerPilot.Api.Options;

public class AIOptions
{
    public const string SectionName = "AI";
    public const int DefaultTimeoutSeconds = 120;
    public const int MinimumTimeoutSeconds = 10;
    public const int MaximumTimeoutSeconds = 300;

    public string ApiKey { get; set; } = string.Empty;

    public string Model { get; set; } = "gpt-5.6-luna";

    public string BaseUrl { get; set; } = "https://api.openai.com/v1/responses";

    public int TimeoutSeconds { get; set; } = DefaultTimeoutSeconds;
}
