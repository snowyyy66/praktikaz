using Marketplace.Core.Entities;

namespace Marketplace.Infrastructure.Utilities;

public static class AuctionHelper
{
    public static bool IsAuctionLive(Product p)
    {
        if ((p.SaleType ?? "fixed") != "auction") return false;
        if (!p.AuctionEndsAt.HasValue) return false;
        return p.AuctionEndsAt.Value > DateTime.UtcNow;
    }

    public static int MaxBid(IQueryable<AuctionBid> bids, int productId) =>
        bids.Where(b => b.ProductId == productId).Select(b => (int?)b.Amount).Max() ?? 0;

    public static int MinNextBid(Product p, int high)
    {
        var step = p.AuctionStep <= 0 ? 500 : p.AuctionStep;
        return high <= 0 ? p.Price : high + step;
    }
}
