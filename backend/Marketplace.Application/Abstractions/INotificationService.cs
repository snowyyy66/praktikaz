using Marketplace.Application.Dtos;

namespace Marketplace.Application.Abstractions;

// Уведомления в приложении и сброс флага прочитано.
public interface INotificationService
{
    Task<IReadOnlyList<NotificationDto>> GetForUserAsync(int userId, CancellationToken ct = default);
    Task MarkReadAsync(int id, CancellationToken ct = default);
    Task MarkAllReadAsync(int userId, CancellationToken ct = default);
}
