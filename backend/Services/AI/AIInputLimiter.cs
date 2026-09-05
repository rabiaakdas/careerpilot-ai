namespace CareerPilot.Api.Services.AI;

public static class AIInputLimiter
{
    public const int MaxCompanyNameCharacters = 200;
    public const int MaxPositionTitleCharacters = 200;
    public const int MaxJobDescriptionCharacters = 8_000;
    public const int MaxResumeTextCharacters = 30_000;

    public static string LimitCompanyName(string value)
    {
        return Limit(value, MaxCompanyNameCharacters);
    }

    public static string LimitPositionTitle(string value)
    {
        return Limit(value, MaxPositionTitleCharacters);
    }

    public static string LimitJobDescription(string value)
    {
        return Limit(value, MaxJobDescriptionCharacters);
    }

    public static string LimitResumeText(string value)
    {
        return Limit(value, MaxResumeTextCharacters);
    }

    private static string Limit(string value, int maxCharacters)
    {
        if (string.IsNullOrEmpty(value) || value.Length <= maxCharacters)
        {
            return value;
        }

        return value[..maxCharacters];
    }
}
