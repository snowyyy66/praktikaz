using System.Text.Json;

namespace Backend.Models.DTOs;

public class CreateProductDto
{
    public string title { get; set; } = "";
    public string description { get; set; } = "";
    public string category_id { get; set; } = "";
    public long price { get; set; }
    public string city { get; set; } = "";
    public string condition { get; set; } = "";
    public long seller_id { get; set; }
    public JsonElement? details { get; set; }
    public JsonElement? images { get; set; }
    public string sale_type { get; set; } = "fixed";
    public string? auction_ends_at { get; set; }
    public long? auction_step { get; set; }
}
