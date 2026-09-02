namespace CareerPilot.Api.Models;

public class User
{
    public Guid Id { get; set; }

    public required string Email { get; set; }

    public required string PasswordHash { get; set; }

    public required string FirstName { get; set; }

    public required string LastName { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<Job> Jobs { get; set; } = [];
}
