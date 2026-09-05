using CareerPilot.Api.Data;
using CareerPilot.Api.Models;
using CareerPilot.Api.Options;
using CareerPilot.Api.Services;
using CareerPilot.Api.Services.AI;
using CareerPilot.Api.Services.Resumes;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

const string DevelopmentCorsPolicy = "DevelopmentCorsPolicy";

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("CareerPilotDb");
var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
    ?? new JwtOptions();
var aiOptions = builder.Configuration.GetSection(AIOptions.SectionName).Get<AIOptions>()
    ?? new AIOptions();
var corsOptions = builder.Configuration.GetSection(CorsOptions.SectionName).Get<CorsOptions>()
    ?? new CorsOptions();

ValidateProductionConfiguration(builder.Configuration, builder.Environment, jwtOptions, aiOptions);

builder.Services.AddDbContext<CareerPilotDbContext>(options =>
    options.UseNpgsql(connectionString));
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.Configure<AIOptions>(builder.Configuration.GetSection(AIOptions.SectionName));
builder.Services.Configure<CorsOptions>(builder.Configuration.GetSection(CorsOptions.SectionName));
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IResumeTextExtractor, ResumeTextExtractor>();
builder.Services.AddHttpClient<IJobAnalysisService, JobAnalysisService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(aiOptions.TimeoutSeconds);
});
builder.Services.AddHttpClient<IResumeJobMatchService, ResumeJobMatchService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(aiOptions.TimeoutSeconds);
});
builder.Services.AddHttpClient<ISkillGapAnalysisService, SkillGapAnalysisService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(aiOptions.TimeoutSeconds);
});
builder.Services.AddHttpClient<ILearningRoadmapService, LearningRoadmapService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(aiOptions.TimeoutSeconds);
});
builder.Services.AddHttpClient<IInterviewPrepService, InterviewPrepService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(aiOptions.TimeoutSeconds);
});
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.IncludeErrorDetails = false;
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key)),
            ClockSkew = TimeSpan.Zero
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddCors(options =>
{
    options.AddPolicy(DevelopmentCorsPolicy, policy =>
    {
        var allowedOrigins = GetAllowedOrigins(corsOptions, builder.Environment);

        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
builder.Services.AddControllers();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler(errorApp =>
    {
        errorApp.Run(async context =>
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";

            await context.Response.WriteAsJsonAsync(new
            {
                message = "An unexpected error occurred."
            });
        });
    });
    app.UseHsts();
}

app.Use(async (context, next) =>
{
    context.Response.Headers.TryAdd("X-Content-Type-Options", "nosniff");
    context.Response.Headers.TryAdd("X-Frame-Options", "DENY");
    context.Response.Headers.TryAdd("Referrer-Policy", "no-referrer");

    await next();
});

app.UseHttpsRedirection();

app.MapGet("/", () => "CareerPilot AI API is running.");
app.UseCors(DevelopmentCorsPolicy);

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

static string[] GetAllowedOrigins(CorsOptions corsOptions, IWebHostEnvironment environment)
{
    var configuredOrigins = corsOptions.AllowedOrigins
        .Where(origin => !string.IsNullOrWhiteSpace(origin))
        .Select(origin => origin.Trim().TrimEnd('/'))
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();

    if (configuredOrigins.Length > 0)
    {
        return configuredOrigins;
    }

    return environment.IsDevelopment()
        ? ["http://localhost:5173"]
        : [];
}

static void ValidateProductionConfiguration(
    IConfiguration configuration,
    IWebHostEnvironment environment,
    JwtOptions jwtOptions,
    AIOptions aiOptions)
{
    if (!environment.IsProduction())
    {
        return;
    }

    var missingSettings = new List<string>();

    if (string.IsNullOrWhiteSpace(configuration.GetConnectionString("CareerPilotDb")))
    {
        missingSettings.Add("ConnectionStrings:CareerPilotDb");
    }

    if (string.IsNullOrWhiteSpace(jwtOptions.Issuer))
    {
        missingSettings.Add("Jwt:Issuer");
    }

    if (string.IsNullOrWhiteSpace(jwtOptions.Audience))
    {
        missingSettings.Add("Jwt:Audience");
    }

    if (string.IsNullOrWhiteSpace(jwtOptions.Key))
    {
        missingSettings.Add("Jwt:Key");
    }

    if (jwtOptions.ExpirationMinutes <= 0)
    {
        missingSettings.Add("Jwt:ExpirationMinutes");
    }

    if (string.IsNullOrWhiteSpace(aiOptions.Model))
    {
        missingSettings.Add("AI:Model");
    }

    if (string.IsNullOrWhiteSpace(aiOptions.BaseUrl))
    {
        missingSettings.Add("AI:BaseUrl");
    }

    if (missingSettings.Count > 0)
    {
        throw new InvalidOperationException(
            $"Production configuration is missing required setting(s): {string.Join(", ", missingSettings)}.");
    }

    if (Encoding.UTF8.GetByteCount(jwtOptions.Key) < 32)
    {
        throw new InvalidOperationException("Production JWT signing key is too short.");
    }
}
