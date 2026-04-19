namespace Marketplace.Api;

/// <summary>Папка с SQLite и uploads — одна для статики и для сохранения загрузок.</summary>
public sealed class MarketplacePaths
{
    public MarketplacePaths(string dataRoot)
    {
        DataRoot = dataRoot;
    }

    public string DataRoot { get; }
    public string UploadsDirectory => Path.Combine(DataRoot, "uploads");
}
