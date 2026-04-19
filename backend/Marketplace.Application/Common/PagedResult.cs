namespace Marketplace.Application.Common;

public class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; set; } = Array.Empty<T>();
    public int Page { get; set; }
    public int Limit { get; set; }
    public int TotalCount { get; set; }
    public bool HasMore => Page * Limit < TotalCount;
}
