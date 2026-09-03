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

builder.Services.AddDbContext<CareerPilotDbContext>(options =>
    options.UseNpgsql(connectionString));
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.Configure<AIOptions>(builder.Configuration.GetSection(AIOptions.SectionName));
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
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
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
        policy.WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
builder.Services.AddControllers();

var app = builder.Build();

app.UseHttpsRedirection();

app.MapGet("/", () => "CareerPilot AI API is running.");
if (app.Environment.IsDevelopment())
{
    app.UseCors(DevelopmentCorsPolicy);
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
