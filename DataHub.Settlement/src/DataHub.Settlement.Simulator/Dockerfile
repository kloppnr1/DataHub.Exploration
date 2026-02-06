FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["src/DataHub.Settlement.Simulator/DataHub.Settlement.Simulator.csproj", "src/DataHub.Settlement.Simulator/"]
RUN dotnet restore "src/DataHub.Settlement.Simulator/DataHub.Settlement.Simulator.csproj"
COPY . .
WORKDIR "/src/src/DataHub.Settlement.Simulator"
RUN dotnet publish -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "DataHub.Settlement.Simulator.dll"]
