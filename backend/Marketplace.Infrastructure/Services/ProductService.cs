using Marketplace.Application.Abstractions;
using Marketplace.Application.Common;
using Marketplace.Application.Dtos;
using Marketplace.Core.Entities;
using Marketplace.Infrastructure.Persistence;
using Marketplace.Infrastructure.Utilities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Nodes;

namespace Marketplace.Infrastructure.Services;

// Каталог и карточка товара: фильтры, сортировка, ставки, фото, CRUD, просмотры/лайки.
public class ProductService : IProductService
{
    private readonly AppDbContext _db;

    public ProductService(AppDbContext db) => _db = db;

    public async Task<PagedResult<ProductListItemDto>> GetProductsAsync(ProductListParameters p, CancellationToken ct = default)
    {
        var page = Math.Max(1, p.Page);
        var limit = Math.Clamp(p.Limit, 1, 100);
        var skip = (page - 1) * limit;

        var q = _db.Products.AsNoTracking().AsQueryable();
        if (p.ActiveOnly)
            q = q.Where(x => x.IsActive);

        if (p.SellerId.HasValue)
            q = q.Where(x => x.SellerId == p.SellerId.Value);

        if (!string.IsNullOrEmpty(p.Category))
            q = q.Where(x => x.CategoryId == p.Category);

        if (!string.IsNullOrWhiteSpace(p.Search))
            q = q.Where(x => x.Title.Contains(p.Search));

        if (!string.IsNullOrWhiteSpace(p.City))
        {
            var term = p.City.Trim().ToLower();
            q = q.Where(x => x.City.ToLower().Contains(term));
        }

        if (p.Auction == "1")
            q = q.Where(x => (x.SaleType ?? "fixed") == "auction");

        q = p.Sort switch
        {
            "price_asc" => q.OrderBy(x => x.Price),
            "price_desc" => q.OrderByDescending(x => x.Price),
            "popular" => q.OrderByDescending(x => x.Views),
            _ => q.OrderByDescending(x => x.CreatedAt),
        };

        var total = await q.CountAsync(ct);
        var products = await q.Skip(skip).Take(limit).ToListAsync(ct);
        if (products.Count == 0)
        {
            return new PagedResult<ProductListItemDto>
            {
                Items = Array.Empty<ProductListItemDto>(),
                Page = page,
                Limit = limit,
                TotalCount = total,
            };
        }

        var sellerIds = products.Select(x => x.SellerId).Distinct().ToList();
        var catIds = products.Select(x => x.CategoryId).Distinct().ToList();
        var sellers = await _db.Users.AsNoTracking().Where(u => sellerIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, ct);
        var cats = await _db.Categories.AsNoTracking().Where(c => catIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, ct);

        HashSet<int>? favSet = null;
        if (p.UserIdForFavorite.HasValue)
        {
            var pids = products.Select(x => x.Id).ToList();
            favSet = (await _db.Favorites.AsNoTracking()
                .Where(f => f.UserId == p.UserIdForFavorite.Value && pids.Contains(f.ProductId))
                .Select(f => f.ProductId)
                .ToListAsync(ct)).ToHashSet();
        }

        var items = products.Select(pr =>
        {
            sellers.TryGetValue(pr.SellerId, out var u);
            cats.TryGetValue(pr.CategoryId, out var c);
            var high = _db.AuctionBids.AsNoTracking().Where(b => b.ProductId == pr.Id).Select(b => (int?)b.Amount).Max() ?? 0;
            return new ProductListItemDto
            {
                Id = pr.Id,
                Title = pr.Title,
                Description = pr.Description,
                CategoryId = pr.CategoryId,
                CategoryName = c?.Name ?? "",
                Price = pr.Price,
                City = pr.City,
                Condition = pr.Condition,
                Views = pr.Views,
                Likes = pr.Likes,
                SellerId = pr.SellerId,
                SellerName = u?.Username ?? "",
                SellerPhone = u?.Phone,
                SellerRating = u?.Rating ?? 0,
                CreatedAt = pr.CreatedAt,
                IsActive = pr.IsActive,
                Details = JsonNodeExtensions.ParseOrEmpty(pr.Details),
                Images = JsonNodeExtensions.ParseOrEmptyArray(pr.Images),
                SaleType = pr.SaleType ?? "fixed",
                AuctionEndsAt = pr.AuctionEndsAt,
                AuctionStep = pr.AuctionStep,
                AuctionHighBid = high > 0 ? high : null,
                IsFavorite = favSet?.Contains(pr.Id) ?? false,
                StockQuantity = pr.StockQuantity,
            };
        }).ToList();

        return new PagedResult<ProductListItemDto>
        {
            Items = items,
            Page = page,
            Limit = limit,
            TotalCount = total,
        };
    }

    public async Task<ProductDetailDto?> GetByIdAsync(int id, int? userIdForFavorite, CancellationToken ct = default)
    {
        var row = await (
            from p in _db.Products.AsNoTracking()
            join seller in _db.Users.AsNoTracking() on p.SellerId equals seller.Id
            join cat in _db.Categories.AsNoTracking() on p.CategoryId equals cat.Id
            where p.Id == id
            select new { p, seller, cat }
        ).FirstOrDefaultAsync(ct);

        if (row == null) return null;

        var pr = row.p;
        var u = row.seller;
        var c = row.cat;

        var high = await _db.AuctionBids.AsNoTracking().Where(b => b.ProductId == id).Select(b => (int?)b.Amount).MaxAsync(ct) ?? 0;
        var bidsCount = await _db.AuctionBids.AsNoTracking().CountAsync(b => b.ProductId == id, ct);

        var leader = high > 0
            ? await _db.AuctionBids.AsNoTracking()
                .Where(b => b.ProductId == id && b.Amount == high)
                .OrderByDescending(b => b.CreatedAt).ThenByDescending(b => b.Id)
                .Join(_db.Users, b => b.BidderId, us => us.Id, (b, us) => new { b.BidderId, us.Username })
                .FirstOrDefaultAsync(ct)
            : null;

        var fav = userIdForFavorite.HasValue &&
            await _db.Favorites.AsNoTracking().AnyAsync(f => f.UserId == userIdForFavorite.Value && f.ProductId == id, ct);

        var live = AuctionHelper.IsAuctionLive(pr);
        var auctionEnded = (pr.SaleType ?? "fixed") == "auction" && pr.AuctionEndsAt.HasValue && !live;

        return new ProductDetailDto
        {
            Id = pr.Id,
            Title = pr.Title,
            Description = pr.Description,
            CategoryId = pr.CategoryId,
            CategoryName = c.Name,
            Price = pr.Price,
            City = pr.City,
            Condition = pr.Condition,
            Views = pr.Views,
            Likes = pr.Likes,
            SellerId = pr.SellerId,
            SellerName = u.Username,
            SellerPhone = u.Phone,
            SellerRating = u.Rating,
            CreatedAt = pr.CreatedAt,
            IsActive = pr.IsActive,
            Details = JsonNodeExtensions.ParseOrEmpty(pr.Details),
            Images = JsonNodeExtensions.ParseOrEmptyArray(pr.Images),
            SaleType = pr.SaleType ?? "fixed",
            AuctionEndsAt = pr.AuctionEndsAt,
            AuctionStep = pr.AuctionStep,
            AuctionHighBid = high > 0 ? high : null,
            IsFavorite = fav,
            StockQuantity = pr.StockQuantity,
            SellerCity = u.City,
            SellerTotalSales = u.TotalSales,
            SellerAvatar = u.Avatar,
            AuctionMinNextBid = (pr.SaleType ?? "fixed") == "auction" ? AuctionHelper.MinNextBid(pr, high) : null,
            AuctionLeaderId = leader?.BidderId,
            AuctionLeaderName = leader?.Username,
            AuctionBidsCount = bidsCount,
            AuctionLive = live,
            AuctionEnded = auctionEnded,
        };
    }

    public async Task IncrementViewsAsync(int id, CancellationToken ct = default)
    {
        await _db.Products.Where(p => p.Id == id).ExecuteUpdateAsync(s => s.SetProperty(p => p.Views, p => p.Views + 1), ct);
    }

    public async Task<CreateEntityResult> CreateAsync(CreateProductDto dto, CancellationToken ct = default)
    {
        var seller = await _db.Users.AnyAsync(u => u.Id == dto.SellerId, ct);
        if (!seller) throw new InvalidOperationException("Продавец не найден");

        var st = dto.SaleType == "auction" ? "auction" : "fixed";
        DateTime? ends = null;
        if (st == "auction")
        {
            if (!dto.AuctionEndsAt.HasValue) throw new InvalidOperationException("Укажите дату окончания торгов");
            ends = dto.AuctionEndsAt.Value.ToUniversalTime();
            if (ends <= DateTime.UtcNow) throw new InvalidOperationException("Окончание торгов должно быть в будущем");
        }

        var step = dto.AuctionStep ?? 500;
        if (step < 1) step = 500;

        var detailsJson = dto.Details == null ? "{}" : dto.Details.ToJsonString();
        var stock = InventoryRules.TracksStock(dto.CategoryId) ? Math.Max(0, dto.StockQuantity) : 0;

        var pr = new Product
        {
            Title = dto.Title.Trim(),
            Description = (dto.Description ?? "").Trim(),
            CategoryId = dto.CategoryId,
            Price = dto.Price,
            City = dto.City.Trim(),
            Condition = dto.Condition.Trim(),
            SellerId = dto.SellerId,
            Details = detailsJson,
            SaleType = st,
            AuctionEndsAt = ends,
            AuctionStep = step,
            StockQuantity = stock,
            CreatedAt = DateTime.UtcNow,
            IsActive = true,
        };

        _db.Products.Add(pr);
        await _db.SaveChangesAsync(ct);
        return new CreateEntityResult { Success = true, Id = pr.Id };
    }

    public async Task UpdateAsync(int id, PatchProductDto dto, CancellationToken ct = default)
    {
        var actorId = dto.ActorId ?? dto.SellerId;
        var pr = await _db.Products.FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new InvalidOperationException("Объявление не найдено");

        var actor = await _db.Users.FirstAsync(u => u.Id == actorId, ct);
        if (pr.SellerId != dto.SellerId && !actor.IsAdmin)
            throw new InvalidOperationException("Нельзя редактировать чужое объявление");

        if (dto.Title != null) pr.Title = dto.Title.Trim();
        if (dto.Description != null) pr.Description = dto.Description.Trim();
        if (dto.CategoryId != null) pr.CategoryId = dto.CategoryId;
        if (dto.Price is { } price)
        {
            if (price < 1) throw new InvalidOperationException("Некорректная цена");
            pr.Price = price;
        }
        if (dto.City != null) pr.City = dto.City.Trim();
        if (dto.Condition != null) pr.Condition = dto.Condition.Trim();
        if (dto.Details != null) pr.Details = dto.Details.ToJsonString();
        if (dto.StockQuantity.HasValue && InventoryRules.TracksStock(pr.CategoryId))
            pr.StockQuantity = Math.Max(0, dto.StockQuantity.Value);

        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int id, int sellerId, int actorId, CancellationToken ct = default)
    {
        var pr = await _db.Products.FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new InvalidOperationException("Объявление не найдено");
        var actor = await _db.Users.FirstAsync(u => u.Id == actorId, ct);
        if (pr.SellerId != sellerId && !actor.IsAdmin)
            throw new InvalidOperationException("Нельзя удалить чужое объявление");

        var convIds = await _db.Conversations.Where(c => c.ProductId == id).Select(c => c.Id).ToListAsync(ct);
        if (convIds.Count > 0)
        {
            await _db.Messages.Where(m => convIds.Contains(m.ConversationId)).ExecuteDeleteAsync(ct);
            await _db.Conversations.Where(c => convIds.Contains(c.Id)).ExecuteDeleteAsync(ct);
        }

        await _db.Favorites.Where(f => f.ProductId == id).ExecuteDeleteAsync(ct);
        await _db.AuctionBids.Where(b => b.ProductId == id).ExecuteDeleteAsync(ct);
        await _db.Reviews.Where(r => r.ProductId == id).ExecuteDeleteAsync(ct);

        var linesToRemove = await _db.OrderItems.Where(i => i.ProductId == id).ToListAsync(ct);
        var affectedOrders = linesToRemove.Select(x => x.OrderId).Distinct().ToList();
        foreach (var line in linesToRemove)
            _db.OrderItems.Remove(line);
        await _db.SaveChangesAsync(ct);

        foreach (var oid in affectedOrders)
        {
            var left = await _db.OrderItems.AnyAsync(i => i.OrderId == oid, ct);
            if (!left)
            {
                var o = await _db.Orders.FirstOrDefaultAsync(x => x.Id == oid, ct);
                if (o != null) _db.Orders.Remove(o);
            }
            else
            {
                var ord = await _db.Orders.Include(o => o.Items).FirstAsync(o => o.Id == oid, ct);
                ord.Total = ord.Items.Sum(i => i.LineTotal);
            }
        }

        await _db.Notifications.Where(n => n.UserId == pr.SellerId && n.Text.Contains(pr.Title)).ExecuteDeleteAsync(ct);
        _db.Products.Remove(pr);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<BidDto>> GetBidsAsync(int productId, CancellationToken ct = default)
    {
        return await _db.AuctionBids.AsNoTracking()
            .Where(b => b.ProductId == productId)
            .OrderByDescending(b => b.CreatedAt).ThenByDescending(b => b.Id)
            .Take(30)
            .Join(_db.Users.AsNoTracking(), b => b.BidderId, u => u.Id, (b, u) => new BidDto
            {
                Id = b.Id,
                Amount = b.Amount,
                CreatedAt = b.CreatedAt,
                BidderName = u.Username,
            })
            .ToListAsync(ct);
    }

    public async Task<PlaceBidResultDto> PlaceBidAsync(int productId, PlaceBidDto dto, CancellationToken ct = default)
    {
        var pr = await _db.Products.FirstOrDefaultAsync(p => p.Id == productId && p.IsActive, ct)
            ?? throw new InvalidOperationException("Лот не найден");
        if ((pr.SaleType ?? "fixed") != "auction") throw new InvalidOperationException("Это не аукцион");
        if (pr.SellerId == dto.BidderId) throw new InvalidOperationException("Нельзя ставить на своё объявление");
        if (!AuctionHelper.IsAuctionLive(pr)) throw new InvalidOperationException("Приём ставок закончился");

        var high = AuctionHelper.MaxBid(_db.AuctionBids, productId);
        var minNext = AuctionHelper.MinNextBid(pr, high);
        if (dto.Amount < minNext)
            throw new InvalidOperationException($"Минимальная ставка: {minNext:N0} ₽");

        _db.AuctionBids.Add(new AuctionBid
        {
            ProductId = productId,
            BidderId = dto.BidderId,
            Amount = dto.Amount,
            CreatedAt = DateTime.UtcNow,
        });

        await _db.Notifications.AddAsync(new Notification
        {
            UserId = pr.SellerId,
            Type = "auction",
            Text = $"Ставка {dto.Amount:N0} ₽ по «{pr.Title}»",
            CreatedAt = DateTime.UtcNow,
        }, ct);

        await _db.SaveChangesAsync(ct);

        var newHigh = AuctionHelper.MaxBid(_db.AuctionBids, productId);
        var leader = await _db.AuctionBids.AsNoTracking()
            .Where(b => b.ProductId == productId && b.Amount == newHigh)
            .OrderByDescending(b => b.CreatedAt).ThenByDescending(b => b.Id)
            .Join(_db.Users, b => b.BidderId, u => u.Id, (b, u) => new { b.BidderId, u.Username })
            .FirstAsync(ct);

        var cnt = await _db.AuctionBids.CountAsync(b => b.ProductId == productId, ct);

        return new PlaceBidResultDto
        {
            Success = true,
            AuctionHighBid = newHigh,
            AuctionMinNextBid = newHigh + (pr.AuctionStep <= 0 ? 500 : pr.AuctionStep),
            AuctionLeaderId = leader.BidderId,
            AuctionLeaderName = leader.Username,
            AuctionBidsCount = cnt,
        };
    }

    public async Task IncrementLikesAsync(int id, CancellationToken ct = default)
    {
        await _db.Products.Where(p => p.Id == id).ExecuteUpdateAsync(s => s.SetProperty(p => p.Likes, p => p.Likes + 1), ct);
    }

    public async Task<AvailabilityDto> GetAvailabilityAsync(int productId, string date, CancellationToken ct = default)
    {
        var rows = await _db.Orders.AsNoTracking()
            .Where(o => o.Items.Any(i => i.ProductId == productId)
                && o.AppointmentDate == date)
            .GroupBy(o => o.AppointmentTime)
            .Select(g => new { Time = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var full = rows.Where(r => r.Count >= 3).Select(r => r.Time!).ToArray();
        return new AvailabilityDto { FullSlots = full };
    }

    public async Task AddImagesAsync(int productId, int sellerId, int actorId, IReadOnlyList<string> fileUrls, CancellationToken ct = default)
    {
        if (fileUrls.Count == 0) throw new InvalidOperationException("Файлы не загружены");
        var pr = await _db.Products.FirstAsync(p => p.Id == productId, ct);
        var actor = await _db.Users.FirstAsync(u => u.Id == actorId, ct);
        if (pr.SellerId != sellerId && !actor.IsAdmin)
            throw new InvalidOperationException("Нельзя добавлять фото в чужое объявление");

        var arr = JsonNodeExtensions.ParseOrEmptyArray(pr.Images) as JsonArray ?? new JsonArray();
        foreach (var url in fileUrls)
            arr.Add(url);
        pr.Images = arr.ToJsonString();
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<string>> RemoveImageAsync(int productId, int sellerId, int actorId, string imageUrl, CancellationToken ct = default)
    {
        var pr = await _db.Products.FirstAsync(p => p.Id == productId, ct);
        var actor = await _db.Users.FirstAsync(u => u.Id == actorId, ct);
        if (pr.SellerId != sellerId && !actor.IsAdmin)
            throw new InvalidOperationException("Нельзя удалять фото из чужого объявления");

        var arr = JsonNodeExtensions.ParseOrEmptyArray(pr.Images) as JsonArray ?? new JsonArray();
        var toRemove = arr.FirstOrDefault(n => n?.ToString() == imageUrl);
        if (toRemove == null) throw new InvalidOperationException("Фото не найдено в объявлении");
        arr.Remove(toRemove);
        pr.Images = arr.ToJsonString();
        await _db.SaveChangesAsync(ct);
        return arr.Select(n => n!.ToString()).ToList();
    }
}
