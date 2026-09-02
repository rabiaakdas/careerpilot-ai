using CareerPilot.Api.Data;
using CareerPilot.Api.Dtos.Auth;
using CareerPilot.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CareerPilot.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    CareerPilotDbContext dbContext,
    IPasswordHasher<User> passwordHasher) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        var password = request.Password;
        var firstName = request.FirstName?.Trim();
        var lastName = request.LastName?.Trim();

        ValidateRegisterRequest(email, password, firstName, lastName);

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var emailExists = await dbContext.Users
            .AnyAsync(user => user.Email == email, cancellationToken);

        if (emailExists)
        {
            return Conflict(new { message = "Email is already registered." });
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = string.Empty,
            FirstName = firstName!,
            LastName = lastName!,
            CreatedAt = DateTime.UtcNow
        };

        user.PasswordHash = passwordHasher.HashPassword(user, password!);

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        return StatusCode(StatusCodes.Status201Created, new
        {
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            user.CreatedAt
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        var password = request.Password;

        ValidateLoginRequest(email, password);

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var user = await dbContext.Users
            .FirstOrDefaultAsync(user => user.Email == email, cancellationToken);

        if (user is null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var passwordResult = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password!);

        if (passwordResult == PasswordVerificationResult.Failed)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        return Ok(new
        {
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName
        });
    }

    private void ValidateRegisterRequest(string email, string? password, string? firstName, string? lastName)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            ModelState.AddModelError(nameof(RegisterRequest.Email), "Email is required.");
        }
        else if (email.Length > 320)
        {
            ModelState.AddModelError(nameof(RegisterRequest.Email), "Email must be 320 characters or fewer.");
        }

        if (string.IsNullOrWhiteSpace(password))
        {
            ModelState.AddModelError(nameof(RegisterRequest.Password), "Password is required.");
        }

        if (string.IsNullOrWhiteSpace(firstName))
        {
            ModelState.AddModelError(nameof(RegisterRequest.FirstName), "First name is required.");
        }

        if (string.IsNullOrWhiteSpace(lastName))
        {
            ModelState.AddModelError(nameof(RegisterRequest.LastName), "Last name is required.");
        }
    }

    private void ValidateLoginRequest(string email, string? password)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            ModelState.AddModelError(nameof(LoginRequest.Email), "Email is required.");
        }

        if (string.IsNullOrWhiteSpace(password))
        {
            ModelState.AddModelError(nameof(LoginRequest.Password), "Password is required.");
        }
    }

    private static string NormalizeEmail(string? email)
    {
        return email?.Trim().ToLowerInvariant() ?? string.Empty;
    }
}
