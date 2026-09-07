FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY backend.csproj ./
RUN dotnet restore ./backend.csproj

COPY . ./
RUN dotnet publish ./backend.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

RUN mkdir -p /app/uploads/resumes && chown -R $APP_UID /app/uploads

COPY --from=build /app/publish ./

USER $APP_UID

ENTRYPOINT ["dotnet", "backend.dll"]
