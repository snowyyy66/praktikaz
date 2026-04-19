namespace Marketplace.Infrastructure.Utilities;

public static class InventoryRules
{
    public static bool TracksStock(string categoryId) =>
        categoryId is not ("services" or "rent");
}
