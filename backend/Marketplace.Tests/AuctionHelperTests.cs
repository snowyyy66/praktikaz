using Marketplace.Core.Entities;
using Marketplace.Infrastructure.Utilities;
using Xunit;

namespace Marketplace.Tests;

public class AuctionHelperTests
{
    [Fact]
    public void MinNextBid_when_no_bids_equals_start_price()
    {
        var p = new Product { Price = 1000, AuctionStep = 100 };
        Assert.Equal(1000, AuctionHelper.MinNextBid(p, 0));
    }

    [Fact]
    public void MinNextBid_after_high_adds_step()
    {
        var p = new Product { Price = 1000, AuctionStep = 50 };
        Assert.Equal(1150, AuctionHelper.MinNextBid(p, 1100));
    }
}
