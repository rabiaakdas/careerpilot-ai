using CareerPilot.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerPilot.Api.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(user => user.Id);

        builder.HasIndex(user => user.Email)
            .IsUnique();

        builder.Property(user => user.Email)
            .IsRequired()
            .HasMaxLength(320);

        builder.Property(user => user.PasswordHash)
            .IsRequired();

        builder.Property(user => user.FirstName)
            .IsRequired();

        builder.Property(user => user.LastName)
            .IsRequired();

        builder.Property(user => user.CreatedAt)
            .IsRequired();
    }
}
