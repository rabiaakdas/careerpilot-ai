using System.Text;
using System.Text.RegularExpressions;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using UglyToad.PdfPig;

namespace CareerPilot.Api.Services.Resumes;

public class ResumeTextExtractor : IResumeTextExtractor
{
    private const string PdfContentType = "application/pdf";
    private const string DocxContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    public Task<string> ExtractTextAsync(
        string filePath,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (!File.Exists(filePath))
        {
            throw new ResumeTextExtractionException(
                ResumeTextExtractionErrorType.CouldNotReadFile,
                "Resume file does not exist.");
        }

        var extension = Path.GetExtension(filePath);
        var extractedText = contentType switch
        {
            PdfContentType when extension.Equals(".pdf", StringComparison.OrdinalIgnoreCase) =>
                ExtractPdfText(filePath, cancellationToken),
            DocxContentType when extension.Equals(".docx", StringComparison.OrdinalIgnoreCase) =>
                ExtractDocxText(filePath, cancellationToken),
            _ => throw new ResumeTextExtractionException(
                ResumeTextExtractionErrorType.UnsupportedFileType,
                "Resume file type is not supported.")
        };

        var cleanedText = CleanText(extractedText);

        if (string.IsNullOrWhiteSpace(cleanedText))
        {
            throw new ResumeTextExtractionException(
                ResumeTextExtractionErrorType.NoReadableText,
                "No readable text could be extracted from the resume.");
        }

        return Task.FromResult(cleanedText);
    }

    private static string ExtractPdfText(string filePath, CancellationToken cancellationToken)
    {
        try
        {
            var builder = new StringBuilder();

            using var document = PdfDocument.Open(filePath);

            foreach (var page in document.GetPages())
            {
                cancellationToken.ThrowIfCancellationRequested();

                if (!string.IsNullOrWhiteSpace(page.Text))
                {
                    builder.AppendLine(page.Text);
                }
            }

            return builder.ToString();
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception exception)
        {
            throw new ResumeTextExtractionException(
                ResumeTextExtractionErrorType.CouldNotReadFile,
                "The PDF resume file could not be read.",
                exception);
        }
    }

    private static string ExtractDocxText(string filePath, CancellationToken cancellationToken)
    {
        try
        {
            var builder = new StringBuilder();

            using var document = WordprocessingDocument.Open(filePath, false);
            var body = document.MainDocumentPart?.Document?.Body;

            if (body is null)
            {
                return string.Empty;
            }

            foreach (var paragraph in body.Descendants<Paragraph>())
            {
                cancellationToken.ThrowIfCancellationRequested();

                var text = paragraph.InnerText;

                if (!string.IsNullOrWhiteSpace(text))
                {
                    builder.AppendLine(text);
                }
            }

            return builder.ToString();
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception exception)
        {
            throw new ResumeTextExtractionException(
                ResumeTextExtractionErrorType.CouldNotReadFile,
                "The DOCX resume file could not be read.",
                exception);
        }
    }

    private static string CleanText(string text)
    {
        var withoutNullCharacters = text.Replace("\0", string.Empty);
        var normalizedLineEndings = withoutNullCharacters.Replace("\r\n", "\n").Replace('\r', '\n');
        var reducedBlankLines = Regex.Replace(normalizedLineEndings, @"\n{3,}", "\n\n");

        return reducedBlankLines.Trim();
    }
}
