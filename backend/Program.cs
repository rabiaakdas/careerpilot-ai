using CareerPilot.Api.Data;
using CareerPilot.Api.Models;
using CareerPilot.Api.Options;
using CareerPilot.Api.Services;
using CareerPilot.Api.Services.AI;
using CareerPilot.Api.Services.Resumes;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using System.Text;

const string DevelopmentCorsPolicy = "DevelopmentCorsPolicy";

var builder = WebApplication.CreateBuilder(args);

ConfigureContainerPort(builder.WebHost, builder.Configuration);

var diagnosticStage = GetDiagnosticStage(builder.Configuration);

if (builder.Configuration.GetValue("Deployment:HealthOnly", false))
{
    var healthApp = builder.Build();

    healthApp.MapGet("/", () => "CareerPilot AI API diagnostic health mode is running.");
    healthApp.MapGet("/health", () => Results.Ok(new { status = "Healthy" }));
    healthApp.Run();
    return;
}

if (diagnosticStage is not null)
{
    RunDiagnosticStartup(builder, diagnosticStage);
    return;
}

var connectionString = GetDatabaseConnectionString(builder.Configuration);
var jwtOptions = GetJwtOptions(builder.Configuration);
var aiOptions = builder.Configuration.GetSection(AIOptions.SectionName).Get<AIOptions>()
    ?? new AIOptions();
var aiRequestTimeoutSeconds = GetAIRequestTimeoutSeconds(aiOptions);
var corsOptions = builder.Configuration.GetSection(CorsOptions.SectionName).Get<CorsOptions>()
    ?? new CorsOptions();

ValidateProductionConfiguration(builder.Environment, connectionString, jwtOptions, aiOptions);

builder.Services.AddDbContext<CareerPilotDbContext>(options =>
    options.UseNpgsql(connectionString));
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
ConfigureJwtOptions(builder.Services, builder.Configuration);
builder.Services.Configure<AIOptions>(builder.Configuration.GetSection(AIOptions.SectionName));
builder.Services.Configure<CorsOptions>(builder.Configuration.GetSection(CorsOptions.SectionName));
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IResumeTextExtractor, ResumeTextExtractor>();
builder.Services.AddHttpClient<IJobAnalysisService, JobAnalysisService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(aiRequestTimeoutSeconds);
});
builder.Services.AddHttpClient<IResumeJobMatchService, ResumeJobMatchService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(aiRequestTimeoutSeconds);
});
builder.Services.AddHttpClient<ISkillGapAnalysisService, SkillGapAnalysisService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(aiRequestTimeoutSeconds);
});
builder.Services.AddHttpClient<ILearningRoadmapService, LearningRoadmapService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(aiRequestTimeoutSeconds);
});
builder.Services.AddHttpClient<IInterviewPrepService, InterviewPrepService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(aiRequestTimeoutSeconds);
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
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

app.UseForwardedHeaders();

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

if (builder.Configuration.GetValue("Deployment:UseHttpsRedirection", true))
{
    app.UseHttpsRedirection();
}

app.MapGet("/", () => "CareerPilot AI API is running.");
app.MapGet("/health", () => Results.Ok(new { status = "Healthy" }));
app.UseCors(DevelopmentCorsPolicy);

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

static string? GetDiagnosticStage(IConfiguration configuration)
{
    var stage = configuration["Deployment:DiagnosticStage"];

    return string.IsNullOrWhiteSpace(stage)
        ? null
        : stage.Trim().ToLowerInvariant();
}

static void RunDiagnosticStartup(WebApplicationBuilder builder, string diagnosticStage)
{
    var stageLevel = GetDiagnosticStageLevel(diagnosticStage);

    if (stageLevel < 0)
    {
        throw new InvalidOperationException("Deployment:DiagnosticStage is not supported.");
    }

    if (stageLevel >= 1)
    {
        var connectionString = GetDatabaseConnectionString(builder.Configuration);

        builder.Services.AddDbContext<CareerPilotDbContext>(options =>
            options.UseNpgsql(connectionString));
    }

    if (stageLevel >= 2)
    {
        var jwtOptions = GetJwtOptions(builder.Configuration);

        builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
        ConfigureJwtOptions(builder.Services, builder.Configuration);
        builder.Services.AddScoped<ITokenService, TokenService>();
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
    }

    if (stageLevel >= 3)
    {
        builder.Services.AddControllers();
    }

    if (stageLevel >= 4)
    {
        builder.Services.AddScoped<IResumeTextExtractor, ResumeTextExtractor>();
    }

    if (stageLevel >= 5)
    {
        var aiOptions = builder.Configuration.GetSection(AIOptions.SectionName).Get<AIOptions>()
            ?? new AIOptions();
        var aiRequestTimeoutSeconds = GetAIRequestTimeoutSeconds(aiOptions);

        builder.Services.Configure<AIOptions>(builder.Configuration.GetSection(AIOptions.SectionName));
        builder.Services.AddHttpClient<IJobAnalysisService, JobAnalysisService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(aiRequestTimeoutSeconds);
        });
        builder.Services.AddHttpClient<IResumeJobMatchService, ResumeJobMatchService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(aiRequestTimeoutSeconds);
        });
        builder.Services.AddHttpClient<ISkillGapAnalysisService, SkillGapAnalysisService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(aiRequestTimeoutSeconds);
        });
        builder.Services.AddHttpClient<ILearningRoadmapService, LearningRoadmapService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(aiRequestTimeoutSeconds);
        });
        builder.Services.AddHttpClient<IInterviewPrepService, InterviewPrepService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(aiRequestTimeoutSeconds);
        });
    }

    if (stageLevel >= 6)
    {
        var corsOptions = builder.Configuration.GetSection(CorsOptions.SectionName).Get<CorsOptions>()
            ?? new CorsOptions();

        builder.Services.Configure<CorsOptions>(builder.Configuration.GetSection(CorsOptions.SectionName));
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
        builder.Services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            options.KnownIPNetworks.Clear();
            options.KnownProxies.Clear();
        });
    }

    var app = builder.Build();

    if (stageLevel >= 6)
    {
        app.UseForwardedHeaders();

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

        if (builder.Configuration.GetValue("Deployment:UseHttpsRedirection", true))
        {
            app.UseHttpsRedirection();
        }

        app.UseCors(DevelopmentCorsPolicy);
    }

    app.MapGet("/", () => $"CareerPilot AI API diagnostic startup stage '{diagnosticStage}' is running.");
    app.MapGet("/health", () => Results.Ok(new
    {
        status = "Healthy",
        diagnosticStage
    }));

    if (stageLevel >= 2)
    {
        app.UseAuthentication();
        app.UseAuthorization();
    }

    if (stageLevel >= 3)
    {
        app.MapControllers();
    }

    app.Run();
}

static int GetDiagnosticStageLevel(string diagnosticStage)
{
    return diagnosticStage switch
    {
        "base" => 0,
        "ef" => 1,
        "jwt" => 2,
        "controllers" => 3,
        "resume" => 4,
        "ai" => 5,
        "cors" => 6,
        _ => -1
    };
}

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
    IWebHostEnvironment environment,
    string? connectionString,
    JwtOptions jwtOptions,
    AIOptions aiOptions)
{
    if (!environment.IsProduction())
    {
        return;
    }

    var missingSettings = new List<string>();

    if (string.IsNullOrWhiteSpace(connectionString))
    {
        missingSettings.Add("DATABASE_URL or ConnectionStrings:CareerPilotDb");
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

static JwtOptions GetJwtOptions(IConfiguration configuration)
{
    var jwtOptions = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
        ?? new JwtOptions();

    ApplyJwtEnvironmentAliases(jwtOptions, configuration);

    return jwtOptions;
}

static void ConfigureJwtOptions(IServiceCollection services, IConfiguration configuration)
{
    services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
    services.Configure<JwtOptions>(options => ApplyJwtEnvironmentAliases(options, configuration));
}

static void ApplyJwtEnvironmentAliases(JwtOptions jwtOptions, IConfiguration configuration)
{
    jwtOptions.Key = GetConfiguredValue(configuration["JWT_KEY"], jwtOptions.Key);
    jwtOptions.Issuer = GetConfiguredValue(configuration["JWT_ISSUER"], jwtOptions.Issuer);
    jwtOptions.Audience = GetConfiguredValue(configuration["JWT_AUDIENCE"], jwtOptions.Audience);
}

static string GetConfiguredValue(string? candidateValue, string currentValue)
{
    return string.IsNullOrWhiteSpace(candidateValue)
        ? currentValue
        : candidateValue;
}

static int GetAIRequestTimeoutSeconds(AIOptions aiOptions)
{
    if (aiOptions.TimeoutSeconds <= 0)
    {
        return AIOptions.DefaultTimeoutSeconds;
    }

    return Math.Clamp(
        aiOptions.TimeoutSeconds,
        AIOptions.MinimumTimeoutSeconds,
        AIOptions.MaximumTimeoutSeconds);
}

static void ConfigureContainerPort(IWebHostBuilder webHost, IConfiguration configuration)
{
    var portValue = configuration["PORT"];
    var isRunningInContainer = string.Equals(
        configuration["DOTNET_RUNNING_IN_CONTAINER"],
        "true",
        StringComparison.OrdinalIgnoreCase);

    if (string.IsNullOrWhiteSpace(portValue) && !isRunningInContainer)
    {
        return;
    }

    var port = 8080;

    if (!string.IsNullOrWhiteSpace(portValue) &&
        (!int.TryParse(portValue, out port) || port <= 0 || port > 65535))
    {
        throw new InvalidOperationException("PORT must be a valid TCP port.");
    }

    webHost.ConfigureKestrel(options =>
    {
        options.ListenAnyIP(port);
    });
}

static string? GetDatabaseConnectionString(IConfiguration configuration)
{
    var databaseUrl = configuration["DATABASE_URL"];

    if (!string.IsNullOrWhiteSpace(databaseUrl))
    {
        return ConvertPostgresDatabaseUrl(databaseUrl);
    }

    return configuration.GetConnectionString("CareerPilotDb");
}

static string ConvertPostgresDatabaseUrl(string databaseUrl)
{
    if (!Uri.TryCreate(databaseUrl, UriKind.Absolute, out var uri) ||
        (uri.Scheme != "postgres" && uri.Scheme != "postgresql"))
    {
        throw new InvalidOperationException("DATABASE_URL must be a valid PostgreSQL URI.");
    }

    var userInfoParts = uri.UserInfo.Split(':', 2);
    var databaseName = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/'));

    if (userInfoParts.Length != 2 ||
        string.IsNullOrWhiteSpace(userInfoParts[0]) ||
        string.IsNullOrWhiteSpace(databaseName))
    {
        throw new InvalidOperationException("DATABASE_URL is missing required PostgreSQL connection parts.");
    }

    var connectionStringBuilder = new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.Port > 0 ? uri.Port : 5432,
        Database = databaseName,
        Username = Uri.UnescapeDataString(userInfoParts[0]),
        Password = Uri.UnescapeDataString(userInfoParts[1]),
        SslMode = SslMode.Require
    };

    ApplyDatabaseUrlQueryOptions(uri.Query, connectionStringBuilder);

    return connectionStringBuilder.ConnectionString;
}

static void ApplyDatabaseUrlQueryOptions(
    string query,
    NpgsqlConnectionStringBuilder connectionStringBuilder)
{
    if (string.IsNullOrWhiteSpace(query))
    {
        return;
    }

    foreach (var parameter in query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
    {
        var parts = parameter.Split('=', 2);
        var key = Uri.UnescapeDataString(parts[0]).Replace("_", string.Empty, StringComparison.OrdinalIgnoreCase);
        var value = parts.Length == 2
            ? Uri.UnescapeDataString(parts[1].Replace("+", " "))
            : string.Empty;

        if (key.Equals("sslmode", StringComparison.OrdinalIgnoreCase) &&
            Enum.TryParse<SslMode>(value, ignoreCase: true, out var sslMode))
        {
            connectionStringBuilder.SslMode = sslMode;
        }
        else if (key.Equals("pooling", StringComparison.OrdinalIgnoreCase) &&
            bool.TryParse(value, out var pooling))
        {
            connectionStringBuilder.Pooling = pooling;
        }
    }
}
