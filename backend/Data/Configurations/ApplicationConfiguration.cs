using CareerPilot.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerPilot.Api.Data.Configurations;

public class ApplicationConfiguration : IEntityTypeConfiguration<Application>
{
    public void Configure(EntityTypeBuilder<Application> builder)
    {
        builder.HasKey(application => application.Id);

        builder.HasIndex(application => new { application.UserId, application.JobId })
            .IsUnique();

        builder.Property(application => application.UserId)
            .IsRequired();

        builder.Property(application => application.JobId)
            .IsRequired();

        builder.Property(application => application.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(application => application.AppliedAt)
            .IsRequired();

        builder.Property(application => application.Notes)
            .HasMaxLength(2000);

        builder.Property(application => application.CreatedAt)
            .IsRequired();

        builder.HasOne(application => application.User)
            .WithMany(user => user.Applications)
            .HasForeignKey(application => application.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(application => application.Job)
            .WithMany(job => job.Applications)
            .HasForeignKey(application => application.JobId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
