using System.Security.Claims;
using CareerPilot.Api.Data;
using CareerPilot.Api.Dtos.Resumes;
using CareerPilot.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CareerPilot.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/resumes")]
public class ResumesController(
    CareerPilotDbContext dbContext,
    IWebHostEnvironment environment) : ControllerBase
{
    private const long MaxFileSize = 5 * 1024 * 1024;
    private const string UploadsDirectory = "uploads";
    private const string ResumesDirectory = "resumes";

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf",
        ".docx"
    };

    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    };

    [HttpPost]
    public async Task<IActionResult> Upload([FromForm] IFormFile? file, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        ValidateFile(file);

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var originalFileName = Path.GetFileName(file!.FileName);
        var extension = Path.GetExtension(originalFileName);
        var storedFileName = $"{Guid.NewGuid()}{extension.ToLowerInvariant()}";
        var relativeFilePath = Path.Combine(UploadsDirectory, ResumesDirectory, storedFileName);
        var uploadDirectory = Path.Combine(environment.ContentRootPath, UploadsDirectory, ResumesDirectory);
        var fullFilePath = Path.Combine(uploadDirectory, storedFileName);

        Directory.CreateDirectory(uploadDirectory);

        await using (var stream = System.IO.File.Create(fullFilePath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var resume = await dbContext.Resumes
            .FirstOrDefaultAsync(resume => resume.UserId == userId.Value, cancellationToken);
        var oldFilePath = resume?.FilePath;
        var now = DateTime.UtcNow;

        if (resume is null)
        {
            resume = new Resume
            {
                Id = Guid.NewGuid(),
                UserId = userId.Value,
                OriginalFileName = originalFileName,
                StoredFileName = storedFileName,
                ContentType = file.ContentType,
                FileSize = file.Length,
                FilePath = relativeFilePath,
                UploadedAt = now
            };

            dbContext.Resumes.Add(resume);
        }
        else
        {
            resume.OriginalFileName = originalFileName;
            resume.StoredFileName = storedFileName;
            resume.ContentType = file.ContentType;
            resume.FileSize = file.Length;
            resume.FilePath = relativeFilePath;
            resume.UpdatedAt = now;
        }

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            DeleteFileIfExists(fullFilePath);
            throw;
        }

        if (!string.IsNullOrWhiteSpace(oldFilePath))
        {
            DeleteStoredFile(oldFilePath);
        }

        return Ok(ToResponse(resume));
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMine(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var resume = await dbContext.Resumes
            .FirstOrDefaultAsync(resume => resume.UserId == userId.Value, cancellationToken);

        if (resume is null)
        {
            return NotFound();
        }

        return Ok(ToResponse(resume));
    }

    [HttpDelete("me")]
    public async Task<IActionResult> DeleteMine(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var resume = await dbContext.Resumes
            .FirstOrDefaultAsync(resume => resume.UserId == userId.Value, cancellationToken);

        if (resume is null)
        {
            return NotFound();
        }

        dbContext.Resumes.Remove(resume);
        await dbContext.SaveChangesAsync(cancellationToken);

        DeleteStoredFile(resume.FilePath);

        return NoContent();
    }

    private Guid? GetCurrentUserId()
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);

        return Guid.TryParse(userIdValue, out var userId) ? userId : null;
    }

    private void ValidateFile(IFormFile? file)
    {
        if (file is null)
        {
            ModelState.AddModelError("File", "Resume file is required.");
            return;
        }

        if (file.Length == 0)
        {
            ModelState.AddModelError("File", "Resume file cannot be empty.");
        }

        if (file.Length > MaxFileSize)
        {
            ModelState.AddModelError("File", "Resume file must be 5 MB or smaller.");
        }

        var originalFileName = Path.GetFileName(file.FileName);
        var extension = Path.GetExtension(originalFileName);

        if (!AllowedExtensions.Contains(extension))
        {
            ModelState.AddModelError("File", "Only PDF and DOCX files are allowed.");
        }

        if (!AllowedContentTypes.Contains(file.ContentType))
        {
            ModelState.AddModelError("File", "File content type is not allowed.");
        }
    }

    private void DeleteStoredFile(string relativeFilePath)
    {
        var uploadDirectory = Path.GetFullPath(
            Path.Combine(environment.ContentRootPath, UploadsDirectory, ResumesDirectory));
        var fullPath = Path.GetFullPath(Path.Combine(environment.ContentRootPath, relativeFilePath));

        if (!fullPath.StartsWith(uploadDirectory, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        DeleteFileIfExists(fullPath);
    }

    private static void DeleteFileIfExists(string fullPath)
    {
        if (System.IO.File.Exists(fullPath))
        {
            System.IO.File.Delete(fullPath);
        }
    }

    private static ResumeResponse ToResponse(Resume resume)
    {
        return new ResumeResponse
        {
            Id = resume.Id,
            OriginalFileName = resume.OriginalFileName,
            ContentType = resume.ContentType,
            FileSize = resume.FileSize,
            UploadedAt = resume.UploadedAt,
            UpdatedAt = resume.UpdatedAt
        };
    }
}
