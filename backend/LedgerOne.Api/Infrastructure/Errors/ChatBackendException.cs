namespace LedgerOne.Api.Infrastructure.Errors;

public sealed class ChatBackendException(string message, Exception? inner = null)
    : Exception(message, inner);
