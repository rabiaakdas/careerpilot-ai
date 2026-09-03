namespace CareerPilot.Api.Services.Resumes;

public enum ResumeTextExtractionErrorType
{
    UnsupportedFileType,
    NoReadableText,
    CouldNotReadFile
}

public class ResumeTextExtractionException(
    ResumeTextExtractionErrorType errorType,
    string message,
    Exception? innerException = null) : Exception(message, innerException)
{
    public ResumeTextExtractionErrorType ErrorType { get; } = errorType;
}
