using CareerPilot.Api.Models;

namespace CareerPilot.Api.Services;

public interface ITokenService
{
    string CreateAccessToken(User user);
}
