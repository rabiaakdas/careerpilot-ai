using CareerPilot.Api.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("CareerPilotDb");

builder.Services.AddDbContext<CareerPilotDbContext>(options =>
    options.UseNpgsql(connectionString));

var app = builder.Build();

app.UseHttpsRedirection();

app.MapGet("/", () => "CareerPilot AI API is running.");

app.Run();
