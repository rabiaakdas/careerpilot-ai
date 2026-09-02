using System.Text.Json.Serialization;

namespace CareerPilot.Api.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ApplicationStatus
{
    Applied,
    Interview,
    Offer,
    Rejected,
    Withdrawn
}
