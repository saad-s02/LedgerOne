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

        RuleFor(r => r.MinAmount)
            .GreaterThanOrEqualTo(0m)
            .When(r => r.MinAmount.HasValue)
            .WithMessage("Must be greater than or equal to 0.");

        RuleFor(r => r.MaxAmount)
            .GreaterThanOrEqualTo(0m)
            .When(r => r.MaxAmount.HasValue)
            .WithMessage("Must be greater than or equal to 0.");

        RuleFor(r => r)
            .Must(r => !(r.MinAmount.HasValue && r.MaxAmount.HasValue) || r.MinAmount <= r.MaxAmount)
            .OverridePropertyName("amountRange")
            .WithMessage("minAmount must be less than or equal to maxAmount.");
    }
}
