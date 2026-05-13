namespace LedgerOne.Api.Infrastructure.Errors;

public sealed class ChatTimeoutException(string message) : Exception(message);
