using CareerPilot.Api.Data;
using CareerPilot.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("CareerPilotDb");

builder.Services.AddDbContext<CareerPilotDbContext>(options =>
    options.UseNpgsql(connectionString));
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddControllers();

var app = builder.Build();

app.UseHttpsRedirection();

app.MapGet("/", () => "CareerPilot AI API is running.");
app.MapControllers();

app.Run();
