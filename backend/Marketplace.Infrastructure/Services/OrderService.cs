using Marketplace.Application.Abstractions;
using Marketplace.Application.Common;
using Marketplace.Application.Dtos;
using Marketplace.Core.Entities;
using Marketplace.Core.Enums;
using Marketplace.Infrastructure.Persistence;
using Marketplace.Infrastructure.Utilities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Marketplace.Infrastructure.Services;

// Заказы: корзина разбивается по продавцам, списание остатков, статусы created/completed.
public class OrderService : IOrderService
{
    private readonly AppDbContext _db;

    public OrderService(AppDbContext db) => _db = db;

    public async Task CreateOrdersAsync(CreateOrderRequestDto dto, CancellationToken ct = default)
    {
        // Строки заказа: либо из items[], либо пара product_id + quantity (один товар).
        var lines = dto.Items is { Count: > 0 }
            ? dto.Items.Select(x => new LineNorm(x.ProductId, Math.Max(1, x.Quantity))).ToList()
            : new List<LineNorm>();

        if (lines.Count == 0)
        {
            if (!dto.ProductId.HasValue)
                throw new ArgumentException("Некорректные параметры заказа");
            lines.Add(new LineNorm(dto.ProductId.Value, Math.Max(1, dto.Quantity ?? 1)));
        }

        var productIds = lines.Select(l => l.ProductId).Distinct().ToList();
        var products = await _db.Products.Where(p => productIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, ct);

        foreach (var line in lines)
        {
            if (!products.TryGetValue(line.ProductId, out var p))
                throw new InvalidOperationException("Товар не найден");
            if (!p.IsActive)
                throw new InvalidOperationException("Товар не найден");
            if (p.SellerId == dto.BuyerId)
                throw new InvalidOperationException("Нельзя купить собственный товар");
        }

        foreach (var group in lines.GroupBy(l => products[l.ProductId].SellerId))
        {
            await CreateSingleSellerOrderAsync(dto, group.ToList(), products, ct);
        }
    }

    private async Task CreateSingleSellerOrderAsync(
        CreateOrderRequestDto dto,
        List<LineNorm> lines,
        Dictionary<int, Product> products,
        CancellationToken ct)
    {
        var sellerId = lines.Select(l => products[l.ProductId].SellerId).Distinct().Single();

        foreach (var line in lines)
        {
            var p = products[line.ProductId];
            if (p.CategoryId == "services" && !string.IsNullOrEmpty(dto.AppointmentDate) && !string.IsNullOrEmpty(dto.AppointmentTime))
            {
                var cnt = await _db.Orders
                    .Where(o => o.Items.Any(i => i.ProductId == line.ProductId)
                        && o.AppointmentDate == dto.AppointmentDate
                        && o.AppointmentTime == dto.AppointmentTime)
                    .CountAsync(ct);
                if (cnt >= 3)
                    throw new InvalidOperationException("Это время уже полностью забронировано (макс. 3 мастера)");
            }
        }

        if (lines.Any(l => products[l.ProductId].CategoryId == "rent"))
        {
            if (lines.Count != 1)
                throw new InvalidOperationException("Аренду оформляют одним заказом");
            var rp = products[lines[0].ProductId];
            if (rp.CategoryId != "rent")
                throw new InvalidOperationException("Ошибка категории аренды");
            var (minH, maxH) = ParseRentHoursRange(rp.Details);
            var hrs = dto.RentHours ?? throw new InvalidOperationException("Укажите срок аренды");
            if (hrs < minH || hrs > maxH)
                throw new InvalidOperationException($"Срок аренды: от {minH} до {maxH} ч.");
        }

        foreach (var line in lines)
        {
            var p = products[line.ProductId];
            if ((p.SaleType ?? "fixed") == "auction")
            {
                if (lines.Count != 1 || line.Quantity != 1)
                    throw new InvalidOperationException("Аукцион — один лот за заказ");
                var high = AuctionHelper.MaxBid(_db.AuctionBids, p.Id);
                var leader = await GetAuctionLeaderAsync(p.Id, high, ct);
                if (leader?.bidderId != dto.BuyerId)
                    throw new InvalidOperationException("Только победитель может оформить заказ");
            }
        }

        await using var trx = await _db.Database.BeginTransactionAsync(ct);

        long total = 0;
        var first = products[lines[0].ProductId];
        var order = new Order
        {
            BuyerId = dto.BuyerId,
            SellerId = sellerId,
            Status = OrderStatus.Created,
            CreatedAt = DateTime.UtcNow,
            RentHours = first.CategoryId == "rent" ? dto.RentHours : null,
            AppointmentDate = dto.AppointmentDate,
            AppointmentTime = dto.AppointmentTime,
            AddressStreet = dto.AddressStreet ?? "",
            AddressHouse = dto.AddressHouse ?? "",
            HouseType = dto.HouseType ?? "apartment",
            AddressEntrance = dto.AddressEntrance ?? "",
            AddressFloor = dto.AddressFloor ?? "",
            AddressApartment = dto.AddressApartment ?? "",
        };

        foreach (var line in lines)
        {
            var p = await _db.Products.FirstAsync(x => x.Id == line.ProductId, ct);
            long lineTotal;
            int qty;
            int unitPrice;

            if (p.CategoryId == "rent")
            {
                var hrs = dto.RentHours!.Value;
                qty = hrs;
                unitPrice = p.Price;
                lineTotal = p.Price * (long)hrs;
            }
            else if ((p.SaleType ?? "fixed") == "auction")
            {
                var high = AuctionHelper.MaxBid(_db.AuctionBids, p.Id);
                qty = 1;
                unitPrice = high;
                lineTotal = high;
            }
            else
            {
                qty = line.Quantity;
                unitPrice = p.Price;
                lineTotal = p.Price * (long)line.Quantity;
            }

            total += lineTotal;

            if (InventoryRules.TracksStock(p.CategoryId))
            {
                var take = p.CategoryId == "rent" ? 1 : line.Quantity;
                if (p.StockQuantity < take)
                    throw new InvalidOperationException($"Недостаточно товара «{p.Title}» на складе");
                p.StockQuantity -= take;
                if (p.StockQuantity <= 0)
                    p.IsActive = false;
            }

            order.Items.Add(new OrderItem
            {
                ProductId = p.Id,
                Quantity = qty,
                UnitPrice = unitPrice,
                LineTotal = lineTotal,
            });
        }

        order.Total = total;
        _db.Orders.Add(order);
        await _db.SaveChangesAsync(ct);

        var preview = string.Join(", ", lines.Select(l => products[l.ProductId].Title).Take(2));
        if (lines.Count > 2) preview += "…";
        var saleText = first.CategoryId == "rent" && lines.Count == 1
            ? $"Аренда «{first.Title}»: {dto.RentHours} ч. — {total:N0} ₽"
            : $"Новый заказ ({lines.Count} поз.): {preview} — {total:N0} ₽, статус: создан";

        _db.Notifications.Add(new Notification
        {
            UserId = sellerId,
            Type = "sale",
            Text = saleText,
            CreatedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync(ct);
        await trx.CommitAsync(ct);
    }

    private async Task<(int bidderId, string name)?> GetAuctionLeaderAsync(int productId, int highAmount, CancellationToken ct)
    {
        if (highAmount <= 0) return null;
        var bid = await _db.AuctionBids.AsNoTracking()
            .Where(b => b.ProductId == productId && b.Amount == highAmount)
            .OrderByDescending(b => b.CreatedAt).ThenByDescending(b => b.Id)
            .FirstOrDefaultAsync(ct);
        if (bid == null) return null;
        var name = await _db.Users.AsNoTracking().Where(u => u.Id == bid.BidderId).Select(u => u.Username).FirstAsync(ct);
        return (bid.BidderId, name);
    }

    private static (int minH, int maxH) ParseRentHoursRange(string detailsJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(detailsJson) ? "{}" : detailsJson);
            var root = doc.RootElement;
            var min = 4;
            var max = 168;
            if (root.TryGetProperty("min_hours", out var minEl))
            {
                var s = minEl.GetString();
                if (s != null && int.TryParse(s, out var v)) min = v;
            }
            if (root.TryGetProperty("max_hours", out var maxEl))
            {
                var s = maxEl.GetString();
                if (s != null && int.TryParse(s, out var v)) max = v;
            }
            return (Math.Max(1, min), Math.Max(min, max));
        }
        catch
        {
            return (4, 168);
        }
    }

    private record LineNorm(int ProductId, int Quantity);

    public async Task<PagedResult<OrderListItemDto>> GetForUserAsync(OrderListParameters p, CancellationToken ct = default)
    {
        var q = _db.Orders.AsNoTracking()
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .Where(o => o.BuyerId == p.UserId || o.SellerId == p.UserId);

        if (p.Status.HasValue)
        {
            q = q.Where(o => o.Status == p.Status.Value);
        }

        q = p.Sort switch
        {
            "total_desc" => q.OrderByDescending(o => o.Total),
            "total_asc" => q.OrderBy(o => o.Total),
            "date_asc" => q.OrderBy(o => o.CreatedAt),
            _ => q.OrderByDescending(o => o.CreatedAt),
        };

        var total = await q.CountAsync(ct);
        var page = Math.Max(1, p.Page);
        var limit = Math.Clamp(p.Limit, 1, 100);
        var rows = await q.Skip((page - 1) * limit).Take(limit).ToListAsync(ct);

        var buyerIds = rows.Select(r => r.BuyerId).Distinct().ToList();
        var sellerIds = rows.Select(r => r.SellerId).Distinct().ToList();
        var users = await _db.Users.AsNoTracking()
            .Where(u => buyerIds.Contains(u.Id) || sellerIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, ct);

        var items = rows.Select(o =>
        {
            var first = o.Items.FirstOrDefault()?.Product;
            var lineDtos = o.Items.Select(i => new OrderItemResponseDto
            {
                ProductId = i.ProductId,
                ProductTitle = i.Product.Title,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                LineTotal = i.LineTotal,
                ProductCategoryId = i.Product.CategoryId,
            }).ToList();

            var title = lineDtos.Count switch
            {
                0 => "",
                1 => lineDtos[0].ProductTitle,
                _ => string.Join(", ", lineDtos.Select(x => x.ProductTitle).Take(2)) + (lineDtos.Count > 2 ? "…" : "")
            };

            return new OrderListItemDto
            {
                Id = o.Id,
                BuyerId = o.BuyerId,
                SellerId = o.SellerId,
                Status = o.Status == OrderStatus.Completed ? "completed" : "created",
                Total = o.Total,
                CreatedAt = o.CreatedAt,
                BuyerName = users[o.BuyerId].Username,
                SellerName = users[o.SellerId].Username,
                RentHours = o.RentHours,
                ProductTitle = title,
                ProductCategoryId = first?.CategoryId ?? "",
                Lines = lineDtos,
            };
        }).ToList();

        return new PagedResult<OrderListItemDto>
        {
            Items = items,
            Page = page,
            Limit = limit,
            TotalCount = total,
        };
    }

    public async Task CompleteOrderAsync(int orderId, int sellerId, int actorId, CancellationToken ct = default)
    {
        var actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == actorId, ct)
            ?? throw new InvalidOperationException("Пользователь не найден");
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == orderId, ct)
            ?? throw new InvalidOperationException("Заказ не найден");

        if (order.SellerId != sellerId && !actor.IsAdmin)
            throw new InvalidOperationException("Нет прав на завершение заказа");

        if (order.Status != OrderStatus.Created)
            throw new InvalidOperationException("Заказ уже завершён");

        order.Status = OrderStatus.Completed;
        var seller = await _db.Users.FirstAsync(u => u.Id == order.SellerId, ct);
        seller.TotalSales += 1;
        seller.TotalEarnings += order.Total;
        await _db.SaveChangesAsync(ct);
    }
}
