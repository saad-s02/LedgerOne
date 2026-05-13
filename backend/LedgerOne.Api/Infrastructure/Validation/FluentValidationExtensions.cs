using FluentValidation;

namespace LedgerOne.Api.Infrastructure.Validation;

public static class FluentValidationExtensions
{
    public static async Task ValidateOrThrowAsync<T>(
        this IValidator<T> validator, T instance, CancellationToken ct)
    {
        var result = await validator.ValidateAsync(instance, ct);
        if (result.IsValid) return;

        var errors = result.Errors
            .GroupBy(e => ToCamel(e.PropertyName))
            .ToDictionary(
                g => g.Key,
                g => g.Select(e => e.ErrorMessage).ToArray());

        throw new ValidationException(errors);
    }

    private static string ToCamel(string s) =>
        string.IsNullOrEmpty(s) ? s : char.ToLowerInvariant(s[0]) + s[1..];
}
