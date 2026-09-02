using Microsoft.EntityFrameworkCore;

namespace CareerPilot.Api.Data;

public class CareerPilotDbContext(DbContextOptions<CareerPilotDbContext> options) : DbContext(options)
{
}
