namespace CareerPilot.Api.Dtos.Jobs;

public class InterviewPrepResponse
{
    public string Summary { get; set; } = string.Empty;

    public List<TechnicalInterviewQuestionResponse> TechnicalQuestions { get; set; } = [];

    public List<BehavioralInterviewQuestionResponse> BehavioralQuestions { get; set; } = [];

    public List<CvBasedInterviewQuestionResponse> CvBasedQuestions { get; set; } = [];

    public List<string> QuestionsToAskEmployer { get; set; } = [];
}

public class TechnicalInterviewQuestionResponse
{
    public string Question { get; set; } = string.Empty;

    public string WhyAsked { get; set; } = string.Empty;

    public string AnswerGuidance { get; set; } = string.Empty;

    public string Difficulty { get; set; } = string.Empty;
}

public class BehavioralInterviewQuestionResponse
{
    public string Question { get; set; } = string.Empty;

    public string WhyAsked { get; set; } = string.Empty;

    public string AnswerGuidance { get; set; } = string.Empty;
}

public class CvBasedInterviewQuestionResponse
{
    public string Question { get; set; } = string.Empty;

    public string CvEvidence { get; set; } = string.Empty;

    public string AnswerGuidance { get; set; } = string.Empty;
}
