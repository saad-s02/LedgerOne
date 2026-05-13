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

        RuleFor(r => r)
            .Must(r => !(r.FromDate.HasValue && r.ToDate.HasValue) || r.FromDate <= r.ToDate)
            .OverridePropertyName("dateRange")
            .WithMessage("fromDate must be on or before toDate.");
    }
}
