using Marketplace.Infrastructure.Utilities;
using Xunit;

namespace Marketplace.Tests;

public class InventoryRulesTests
{
    [Fact]
    public void TracksStock_ordinary_categories()
    {
        Assert.True(InventoryRules.TracksStock("items"));
        Assert.True(InventoryRules.TracksStock("transport"));
    }

    [Fact]
    public void DoesNotTrack_services_and_rent()
    {
        Assert.False(InventoryRules.TracksStock("services"));
        Assert.False(InventoryRules.TracksStock("rent"));
    }
}
