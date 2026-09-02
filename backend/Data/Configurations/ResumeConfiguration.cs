using CareerPilot.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerPilot.Api.Data.Configurations;

public class ResumeConfiguration : IEntityTypeConfiguration<Resume>
{
    public void Configure(EntityTypeBuilder<Resume> builder)
    {
        builder.HasKey(resume => resume.Id);

        builder.HasIndex(resume => resume.UserId)
            .IsUnique();

        builder.Property(resume => resume.UserId)
            .IsRequired();

        builder.Property(resume => resume.OriginalFileName)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(resume => resume.StoredFileName)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(resume => resume.ContentType)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(resume => resume.FileSize)
            .IsRequired();

        builder.Property(resume => resume.FilePath)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(resume => resume.UploadedAt)
            .IsRequired();

        builder.HasOne(resume => resume.User)
            .WithOne(user => user.Resume)
            .HasForeignKey<Resume>(resume => resume.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
