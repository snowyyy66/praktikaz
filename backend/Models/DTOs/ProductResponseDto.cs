namespace Backend.Models.DTOs;

public class ProductResponseDto
{
    public long id { get; set; }
    public string title { get; set; } = "";
    public string description { get; set; } = "";
    public string category_id { get; set; } = "";
    public long price { get; set; }
    public string city { get; set; } = "";
    public string condition { get; set; } = "";
    public long views { get; set; }
    public long likes { get; set; }
    public long seller_id { get; set; }
    public string seller_name { get; set; } = "";
    public string created_at { get; set; } = "";
    public bool is_favorite { get; set; }
    public object details { get; set; } = new { };
    public object images { get; set; } = new string[] { };
    public string sale_type { get; set; } = "fixed";
    public bool show_reviews_on_page { get; set; } = true;
    public bool can_review { get; set; }
    public object? user_review { get; set; }

    // Auction fields
    public string? auction_ends_at { get; set; }
    public long auction_step { get; set; }
    public bool auction_live { get; set; }
    public bool auction_ended { get; set; }
    public long? auction_high_bid { get; set; }
    public long? auction_leader_id { get; set; }
    public string? auction_leader_name { get; set; }
    public long? auction_min_next_bid { get; set; }
    public int auction_bids_count { get; set; }
}

