// Дополнительные сервисы в одном файле: категории, избранное, поиск, отзывы, чаты, уведомления, админ.
using Marketplace.Application.Abstractions;
using Marketplace.Application.Dtos;
using Marketplace.Core.Entities;
using Marketplace.Core.Enums;
using Marketplace.Infrastructure.Persistence;
using Marketplace.Infrastructure.Utilities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Nodes;

namespace Marketplace.Infrastructure.Services;

// Справочник категорий для фильтров и форм.
public class CategoryService : ICategoryService
{
    private readonly AppDbContext _db;
    public CategoryService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<CategoryDto>> GetAllAsync(CancellationToken ct = default)
    {
        var rows = await _db.Categories.AsNoTracking().OrderBy(c => c.Id).ToListAsync(ct);
        return rows.Select(c => new CategoryDto { Id = c.Id, Name = c.Name }).ToList();
    }
}

// Избранное: переключение и список карточек с пометкой is_favorite.
public class FavoriteService : IFavoriteService
{
    private readonly AppDbContext _db;
    public FavoriteService(AppDbContext db) => _db = db;

    public async Task<ToggleFavoriteResultDto> ToggleAsync(int userId, int productId, CancellationToken ct = default)
    {
        var existing = await _db.Favorites.FirstOrDefaultAsync(f => f.UserId == userId && f.ProductId == productId, ct);
        if (existing != null)
        {
            _db.Favorites.Remove(existing);
            await _db.SaveChangesAsync(ct);
            return new ToggleFavoriteResultDto { Success = true, Favorited = false };
        }

        _db.Favorites.Add(new Favorite { UserId = userId, ProductId = productId, CreatedAt = DateTime.UtcNow });
        await _db.SaveChangesAsync(ct);
        return new ToggleFavoriteResultDto { Success = true, Favorited = true };
    }

    public async Task<IReadOnlyList<ProductListItemDto>> GetUserFavoritesAsync(int userId, CancellationToken ct = default)
    {
        var rows = await (
            from f in _db.Favorites.AsNoTracking()
            join p in _db.Products.AsNoTracking() on f.ProductId equals p.Id
            join u in _db.Users.AsNoTracking() on p.SellerId equals u.Id
            join c in _db.Categories.AsNoTracking() on p.CategoryId equals c.Id
            where f.UserId == userId
            orderby f.CreatedAt descending
            select new { p, u, c }
        ).Take(20).ToListAsync(ct);

        return rows.Select(x =>
        {
            var high = _db.AuctionBids.AsNoTracking().Where(b => b.ProductId == x.p.Id).Select(b => (int?)b.Amount).Max() ?? 0;
            return new ProductListItemDto
            {
                Id = x.p.Id,
                Title = x.p.Title,
                Description = x.p.Description,
                CategoryId = x.p.CategoryId,
                CategoryName = x.c.Name,
                Price = x.p.Price,
                City = x.p.City,
                Condition = x.p.Condition,
                Views = x.p.Views,
                Likes = x.p.Likes,
                SellerId = x.p.SellerId,
                SellerName = x.u.Username,
                SellerPhone = x.u.Phone,
                SellerRating = x.u.Rating,
                CreatedAt = x.p.CreatedAt,
                IsActive = x.p.IsActive,
                Details = JsonNodeExtensions.ParseOrEmpty(x.p.Details),
                Images = JsonNodeExtensions.ParseOrEmptyArray(x.p.Images),
                SaleType = x.p.SaleType ?? "fixed",
                AuctionEndsAt = x.p.AuctionEndsAt,
                AuctionStep = x.p.AuctionStep,
                AuctionHighBid = high > 0 ? high : null,
                IsFavorite = true,
                StockQuantity = x.p.StockQuantity,
            };
        }).ToList();
    }
}

// Поиск активных товаров по подстроке в названии и описании.
public class SearchService : ISearchService
{
    private readonly AppDbContext _db;
    public SearchService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<ProductListItemDto>> SearchAsync(string? q, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(q)) return Array.Empty<ProductListItemDto>();
        var term = q.Trim();
        var rows = await (
            from p in _db.Products.AsNoTracking()
            join u in _db.Users.AsNoTracking() on p.SellerId equals u.Id
            join c in _db.Categories.AsNoTracking() on p.CategoryId equals c.Id
            where p.IsActive && (p.Title.Contains(term) || p.Description.Contains(term))
            orderby p.CreatedAt descending
            select new { p, u, c }
        ).Take(20).ToListAsync(ct);

        return rows.Select(x => new ProductListItemDto
        {
            Id = x.p.Id,
            Title = x.p.Title,
            Description = x.p.Description,
            CategoryId = x.p.CategoryId,
            CategoryName = x.c.Name,
            Price = x.p.Price,
            City = x.p.City,
            Condition = x.p.Condition,
            Views = x.p.Views,
            Likes = x.p.Likes,
            SellerId = x.p.SellerId,
            SellerName = x.u.Username,
            SellerRating = x.u.Rating,
            CreatedAt = x.p.CreatedAt,
            IsActive = x.p.IsActive,
            Details = JsonNodeExtensions.ParseOrEmpty(x.p.Details),
            Images = JsonNodeExtensions.ParseOrEmptyArray(x.p.Images),
            SaleType = x.p.SaleType ?? "fixed",
            AuctionEndsAt = x.p.AuctionEndsAt,
            AuctionStep = x.p.AuctionStep,
            StockQuantity = x.p.StockQuantity,
        }).ToList();
    }
}

// Отзывы: только после завершённой покупки; обновление рейтинга продавца.
public class ReviewService : IReviewService
{
    private readonly AppDbContext _db;
    public ReviewService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<ReviewDto>> GetForProductAsync(int productId, CancellationToken ct = default)
    {
        return await (
            from r in _db.Reviews.AsNoTracking()
            join u in _db.Users.AsNoTracking() on r.ReviewerId equals u.Id
            where r.ProductId == productId
            orderby r.CreatedAt descending
            select new ReviewDto
            {
                Id = r.Id,
                ReviewerId = r.ReviewerId,
                ReviewerName = u.Username,
                Rating = r.Rating,
                Text = r.Text,
                CreatedAt = r.CreatedAt,
            }
        ).ToListAsync(ct);
    }

    public async Task CreateAsync(CreateReviewDto dto, CancellationToken ct = default)
    {
        if (dto.Rating < 1 || dto.Rating > 5)
            throw new InvalidOperationException("Рейтинг от 1 до 5");

        var product = await _db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == dto.ProductId, ct)
            ?? throw new InvalidOperationException("Товар не найден");

        var hasPurchase = await (
            from i in _db.OrderItems
            join o in _db.Orders on i.OrderId equals o.Id
            where i.ProductId == dto.ProductId && o.BuyerId == dto.ReviewerId && o.Status == OrderStatus.Completed
            select i
        ).AnyAsync(ct);

        if (!hasPurchase)
            throw new InvalidOperationException("Отзыв можно оставить только после покупки товара");

        try
        {
            _db.Reviews.Add(new Review
            {
                ReviewerId = dto.ReviewerId,
                TargetUserId = product.SellerId,
                ProductId = dto.ProductId,
                Rating = dto.Rating,
                Text = dto.Text ?? "",
                CreatedAt = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync(ct);

            var avg = await _db.Reviews.Where(r => r.TargetUserId == product.SellerId).AverageAsync(r => (double?)r.Rating, ct) ?? 5.0;
            await _db.Users.Where(u => u.Id == product.SellerId).ExecuteUpdateAsync(s => s.SetProperty(u => u.Rating, Math.Round(avg * 10) / 10), ct);

            await _db.Notifications.AddAsync(new Notification
            {
                UserId = product.SellerId,
                Type = "review",
                Text = $"Новый отзыв на ваш товар — оценка {dto.Rating}/5",
                CreatedAt = DateTime.UtcNow,
            }, ct);
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            throw new InvalidOperationException("Вы уже оставили отзыв на этот товар");
        }
    }
}

// Чаты: пара пользователей (+ опционально товар), сообщения, непрочитанные.
public class ConversationService : IConversationService
{
    private readonly AppDbContext _db;
    public ConversationService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<ConversationListDto>> GetListAsync(int userId, CancellationToken ct = default)
    {
        var admin = await _db.Users.AsNoTracking().Where(u => u.Id == userId).Select(u => u.IsAdmin).FirstAsync(ct);

        var query =
            from c in _db.Conversations.AsNoTracking()
            join u1 in _db.Users.AsNoTracking() on c.User1Id equals u1.Id
            join u2 in _db.Users.AsNoTracking() on c.User2Id equals u2.Id
            join p in _db.Products.AsNoTracking() on c.ProductId equals p.Id into pj
            from p in pj.DefaultIfEmpty()
            where admin || c.User1Id == userId || c.User2Id == userId
            select new { c, u1, u2, ProductTitle = p != null ? p.Title : null };

        var rows = await query.ToListAsync(ct);

        var result = new List<ConversationListDto>();
        foreach (var x in rows)
        {
            var last = await _db.Messages.AsNoTracking()
                .Where(m => m.ConversationId == x.c.Id)
                .OrderByDescending(m => m.Id)
                .Select(m => new { m.Text, m.CreatedAt })
                .FirstOrDefaultAsync(ct);

            var unread = await _db.Messages.CountAsync(m => m.ConversationId == x.c.Id && !m.IsRead && m.SenderId != userId, ct);

            result.Add(new ConversationListDto
            {
                Id = x.c.Id,
                User1Id = x.c.User1Id,
                User2Id = x.c.User2Id,
                User1Name = x.u1.Username,
                User2Name = x.u2.Username,
                User1IsAdmin = x.u1.IsAdmin,
                User2IsAdmin = x.u2.IsAdmin,
                ProductId = x.c.ProductId,
                ProductTitle = x.ProductTitle,
                LastMessage = last?.Text,
                LastAt = last?.CreatedAt.ToString("o"),
                UnreadCount = unread,
            });
        }

        return result.OrderByDescending(r => r.LastAt).ToList();
    }

    public async Task<int> FindOrCreateAsync(CreateConversationDto dto, CancellationToken ct = default)
    {
        var a = Math.Min(dto.User1Id, dto.User2Id);
        var b = Math.Max(dto.User1Id, dto.User2Id);

        Conversation? existing;
        if (dto.ProductId == null)
            existing = await _db.Conversations.FirstOrDefaultAsync(c => c.User1Id == a && c.User2Id == b && c.ProductId == null, ct);
        else
            existing = await _db.Conversations.FirstOrDefaultAsync(c => c.User1Id == a && c.User2Id == b && c.ProductId == dto.ProductId, ct);

        if (existing != null) return existing.Id;

        var conv = new Conversation
        {
            User1Id = a,
            User2Id = b,
            ProductId = dto.ProductId,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Conversations.Add(conv);
        await _db.SaveChangesAsync(ct);
        return conv.Id;
    }

    public async Task<IReadOnlyList<MessageDto>> GetMessagesAsync(int conversationId, int userId, CancellationToken ct = default)
    {
        var conv = await _db.Conversations.AsNoTracking().FirstOrDefaultAsync(c => c.Id == conversationId, ct)
            ?? throw new InvalidOperationException("Диалог не найден");
        var user = await _db.Users.AsNoTracking().FirstAsync(u => u.Id == userId, ct);
        if (!user.IsAdmin && userId != conv.User1Id && userId != conv.User2Id)
            throw new InvalidOperationException("Нет доступа к этому диалогу");

        if (!user.IsAdmin)
            await _db.Messages.Where(m => m.ConversationId == conversationId && m.SenderId != userId)
                .ExecuteUpdateAsync(s => s.SetProperty(m => m.IsRead, true), ct);

        return await _db.Messages.AsNoTracking()
            .Where(m => m.ConversationId == conversationId)
            .Join(_db.Users.AsNoTracking(), m => m.SenderId, u => u.Id, (m, u) => new MessageDto
            {
                Id = m.Id,
                ConversationId = m.ConversationId,
                SenderId = m.SenderId,
                SenderName = u.Username,
                SenderIsAdmin = u.IsAdmin,
                Text = m.Text,
                IsRead = m.IsRead,
                CreatedAt = m.CreatedAt,
            })
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<MessageDto> SendMessageAsync(int conversationId, SendMessageDto dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Text)) throw new InvalidOperationException("Пустое сообщение");

        var conv = await _db.Conversations.FirstOrDefaultAsync(c => c.Id == conversationId, ct)
            ?? throw new InvalidOperationException("Диалог не найден");
        var sender = await _db.Users.FirstAsync(u => u.Id == dto.SenderId, ct);
        if (!sender.IsAdmin && dto.SenderId != conv.User1Id && dto.SenderId != conv.User2Id)
            throw new InvalidOperationException("Нет доступа к этому диалогу");

        var msg = new Message
        {
            ConversationId = conversationId,
            SenderId = dto.SenderId,
            Text = dto.Text.Trim(),
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Messages.Add(msg);
        await _db.SaveChangesAsync(ct);

        return await _db.Messages.AsNoTracking()
            .Where(m => m.Id == msg.Id)
            .Join(_db.Users.AsNoTracking(), m => m.SenderId, u => u.Id, (m, u) => new MessageDto
            {
                Id = m.Id,
                ConversationId = m.ConversationId,
                SenderId = m.SenderId,
                SenderName = u.Username,
                SenderIsAdmin = u.IsAdmin,
                Text = m.Text,
                IsRead = m.IsRead,
                CreatedAt = m.CreatedAt,
            })
            .FirstAsync(ct);
    }
}

// In-app уведомления (лента и пометка прочитано).
public class NotificationService : INotificationService
{
    private readonly AppDbContext _db;
    public NotificationService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<NotificationDto>> GetForUserAsync(int userId, CancellationToken ct = default)
    {
        return await _db.Notifications.AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .Select(n => new NotificationDto
            {
                Id = n.Id,
                Type = n.Type,
                Text = n.Text,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt,
            })
            .ToListAsync(ct);
    }

    public async Task MarkReadAsync(int id, CancellationToken ct = default)
    {
        await _db.Notifications.Where(n => n.Id == id).ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), ct);
    }

    public async Task MarkAllReadAsync(int userId, CancellationToken ct = default)
    {
        await _db.Notifications.Where(n => n.UserId == userId).ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), ct);
    }
}

// Админ: полный список объявлений при проверке флага is_admin.
public class AdminService : IAdminService
{
    private readonly AppDbContext _db;
    public AdminService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<ProductListItemDto>> GetAllProductsAsync(int adminUserId, CancellationToken ct = default)
    {
        var isAdmin = await _db.Users.AnyAsync(u => u.Id == adminUserId && u.IsAdmin, ct);
        if (!isAdmin) throw new InvalidOperationException("Доступ только для администратора");

        var rows = await (
            from p in _db.Products.AsNoTracking()
            join c in _db.Categories.AsNoTracking() on p.CategoryId equals c.Id
            join u in _db.Users.AsNoTracking() on p.SellerId equals u.Id
            orderby p.CreatedAt descending
            select new { p, c, u }
        ).Take(500).ToListAsync(ct);

        return rows.Select(x => new ProductListItemDto
        {
            Id = x.p.Id,
            Title = x.p.Title,
            Description = x.p.Description,
            CategoryId = x.p.CategoryId,
            CategoryName = x.c.Name,
            Price = x.p.Price,
            City = x.p.City,
            Condition = x.p.Condition,
            Views = x.p.Views,
            Likes = x.p.Likes,
            SellerId = x.p.SellerId,
            SellerName = x.u.Username,
            SellerRating = x.u.Rating,
            CreatedAt = x.p.CreatedAt,
            IsActive = x.p.IsActive,
            Details = JsonNodeExtensions.ParseOrEmpty(x.p.Details),
            Images = JsonNodeExtensions.ParseOrEmptyArray(x.p.Images),
            SaleType = x.p.SaleType ?? "fixed",
            AuctionEndsAt = x.p.AuctionEndsAt,
            AuctionStep = x.p.AuctionStep,
            StockQuantity = x.p.StockQuantity,
        }).ToList();
    }
}
