# syntax=docker/dockerfile:1.7
# Build context is the repo root so the SDK image can see global.json + backend/.

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY global.json ./
COPY backend/Directory.Build.props backend/Directory.Packages.props ./backend/
COPY backend/LedgerOne.Api/LedgerOne.Api.csproj ./backend/LedgerOne.Api/
RUN dotnet restore ./backend/LedgerOne.Api/LedgerOne.Api.csproj

COPY backend/LedgerOne.Api/ ./backend/LedgerOne.Api/
RUN dotnet publish ./backend/LedgerOne.Api/LedgerOne.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish ./
ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_RUNNING_IN_CONTAINER=true
EXPOSE 8080
ENTRYPOINT ["dotnet", "LedgerOne.Api.dll"]
