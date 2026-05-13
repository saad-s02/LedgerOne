namespace LedgerOne.Api.Infrastructure.Errors;

public sealed class ChatNotConfiguredException(string message) : Exception(message);
