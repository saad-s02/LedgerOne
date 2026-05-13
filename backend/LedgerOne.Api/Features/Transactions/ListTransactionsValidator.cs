using FluentValidation;

namespace LedgerOne.Api.Features.Transactions;

public class ListTransactionsValidator : AbstractValidator<ListTransactionsRequest>
{
    public ListTransactionsValidator()
    {
        RuleFor(r => r.Page)
            .GreaterThanOrEqualTo(1)
            .WithMessage("Must be greater than or equal to 1.");

        RuleFor(r => r.PageSize)
            .InclusiveBetween(1, 100)
            .WithMessage("Must be between 1 and 100.");
    }
}
