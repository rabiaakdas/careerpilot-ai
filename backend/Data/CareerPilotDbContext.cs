using CareerPilot.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CareerPilot.Api.Data;

public class CareerPilotDbContext(DbContextOptions<CareerPilotDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    public DbSet<Job> Jobs => Set<Job>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CareerPilotDbContext).Assembly);
    }
}
