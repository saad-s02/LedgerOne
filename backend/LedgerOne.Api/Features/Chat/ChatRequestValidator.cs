using FluentValidation;

namespace LedgerOne.Api.Features.Chat;

public class ChatRequestValidator : AbstractValidator<ChatRequest>
{
    public ChatRequestValidator()
    {
        RuleFor(r => r.Message)
            .NotEmpty()
            .WithMessage("message is required.")
            .Must(m => m == null || m.Trim().Length >= 1)
            .WithMessage("message is required.")
            .Must(m => m == null || m.Length <= 2000)
            .WithMessage("Must be at most 2000 characters.");

        RuleFor(r => r.ConversationHistory)
            .NotNull()
            .Must(h => h == null || h.Count <= 20)
            .OverridePropertyName("conversationHistory")
            .WithMessage("Must contain at most 20 entries.");

        RuleForEach(r => r.ConversationHistory).ChildRules(item =>
        {
            item.RuleFor(m => m.Role)
                .Must(r => r == "user" || r == "assistant")
                .WithMessage("Must be \"user\" or \"assistant\".");
            item.RuleFor(m => m.Content)
                .NotEmpty()
                .WithMessage("content is required.")
                .Must(c => c == null || c.Length <= 2000)
                .WithMessage("Must be at most 2000 characters.");
        });
    }
}
