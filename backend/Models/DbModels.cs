namespace Backend.Models;

public class User
{
    public long id { get; set; }
    public string username { get; set; } = "";
    public string email { get; set; } = "";
    public string password { get; set; } = "";
    public long is_admin { get; set; }
    public string phone { get; set; } = "";
    public string city { get; set; } = "";
    public string avatar { get; set; } = "";
    public string created_at { get; set; } = "";
    public double rating { get; set; }
    public long total_sales { get; set; }
    public long total_earnings { get; set; }
}

public class Category
{
    public string id { get; set; } = "";
    public string name { get; set; } = "";
}

public class Product
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
    public string created_at { get; set; } = "";
    public long is_active { get; set; }
    public string details { get; set; } = "{}";
    public string images { get; set; } = "[]";
    public string sale_type { get; set; } = "fixed";
    public string auction_ends_at { get; set; } = "";
    public long auction_step { get; set; }
}

public class Order
{
    public long id { get; set; }
    public long buyer_id { get; set; }
    public long seller_id { get; set; }
    public long product_id { get; set; }
    public string status { get; set; } = "completed";
    public long total { get; set; }
    public string created_at { get; set; } = "";
    public long? rent_hours { get; set; }
    public string? appointment_date { get; set; }
    public string? appointment_time { get; set; }
    public string? address_street { get; set; }
    public string? address_house { get; set; }
    public string? house_type { get; set; }
    public string? address_entrance { get; set; }
    public string? address_floor { get; set; }
    public string? address_apartment { get; set; }
}

public class AuctionBid
{
    public long id { get; set; }
    public long product_id { get; set; }
    public long bidder_id { get; set; }
    public long amount { get; set; }
    public string created_at { get; set; } = "";
}

public class Favorite
{
    public long id { get; set; }
    public long user_id { get; set; }
    public long product_id { get; set; }
    public string created_at { get; set; } = "";
}

public class Conversation
{
    public long id { get; set; }
    public long user1_id { get; set; }
    public long user2_id { get; set; }
    public long? product_id { get; set; }
    public string created_at { get; set; } = "";
}

public class Message
{
    public long id { get; set; }
    public long conversation_id { get; set; }
    public long sender_id { get; set; }
    public string text { get; set; } = "";
    public long is_read { get; set; }
    public string created_at { get; set; } = "";
}

public class Review
{
    public long id { get; set; }
    public long reviewer_id { get; set; }
    public long target_user_id { get; set; }
    public long product_id { get; set; }
    public long rating { get; set; }
    public string text { get; set; } = "";
    public string created_at { get; set; } = "";
}

public class Notification
{
    public long id { get; set; }
    public long user_id { get; set; }
    public string type { get; set; } = "";
    public string text { get; set; } = "";
    public long is_read { get; set; }
    public string created_at { get; set; } = "";
    public long? related_user_id { get; set; }
    public long? related_product_id { get; set; }
}
