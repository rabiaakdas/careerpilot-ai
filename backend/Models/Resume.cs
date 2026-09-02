namespace CareerPilot.Api.Models;

public class Resume
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public required string OriginalFileName { get; set; }

    public required string StoredFileName { get; set; }

    public required string ContentType { get; set; }

    public long FileSize { get; set; }

    public required string FilePath { get; set; }

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public User? User { get; set; }
}
