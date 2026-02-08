namespace DataHub.Settlement.Application.Onboarding;

public record Signup(
    Guid Id,
    string SignupNumber,
    string DarId,
    string Gsrn,
    Guid CustomerId,
    Guid ProductId,
    Guid? ProcessRequestId,
    string Type,
    DateOnly EffectiveDate,
    string Status,
    string? RejectionReason);

public record SignupStatusResponse(
    string SignupId,
    string Status,
    string Gsrn,
    DateOnly EffectiveDate,
    string? RejectionReason);

public record SignupRequest(
    string DarId,
    string CustomerName,
    string CprCvr,
    string ContactType,
    string Email,
    string Phone,
    Guid ProductId,
    string Type,
    DateOnly EffectiveDate);

public record SignupResponse(
    string SignupId,
    string Status,
    string Gsrn,
    DateOnly EffectiveDate);
