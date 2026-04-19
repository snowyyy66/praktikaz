namespace Backend.Models.DTOs;

public class PagedResult<T>
{
    public IEnumerable<T> items { get; set; } = new List<T>();
    public int total_count { get; set; }
    public int page { get; set; }
    public int limit { get; set; }
    public bool has_more { get; set; }
}
