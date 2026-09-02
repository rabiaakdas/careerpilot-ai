using CareerPilot.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerPilot.Api.Data.Configurations;

public class JobConfiguration : IEntityTypeConfiguration<Job>
{
    public void Configure(EntityTypeBuilder<Job> builder)
    {
        builder.HasKey(job => job.Id);

        builder.HasIndex(job => job.UserId);

        builder.Property(job => job.UserId)
            .IsRequired();

        builder.Property(job => job.CompanyName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(job => job.PositionTitle)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(job => job.Description)
            .IsRequired()
            .HasMaxLength(4000);

        builder.Property(job => job.Location)
            .HasMaxLength(200);

        builder.Property(job => job.JobUrl)
            .HasMaxLength(1000);

        builder.Property(job => job.CreatedAt)
            .IsRequired();

        builder.HasOne(job => job.User)
            .WithMany(user => user.Jobs)
            .HasForeignKey(job => job.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
