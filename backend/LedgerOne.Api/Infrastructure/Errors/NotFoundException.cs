namespace LedgerOne.Api.Infrastructure.Errors;

public sealed class NotFoundException(string resource, object key)
    : Exception($"{resource} with id {key} was not found.")
{
    public string Resource { get; } = resource;
    public object Key { get; } = key;
}
