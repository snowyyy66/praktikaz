using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "auction_bids",
                columns: table => new
                {
                    id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    product_id = table.Column<long>(type: "INTEGER", nullable: false),
                    bidder_id = table.Column<long>(type: "INTEGER", nullable: false),
                    amount = table.Column<long>(type: "INTEGER", nullable: false),
                    created_at = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_auction_bids", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "categories",
                columns: table => new
                {
                    id = table.Column<string>(type: "TEXT", nullable: false),
                    name = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_categories", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "conversations",
                columns: table => new
                {
                    id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    user1_id = table.Column<long>(type: "INTEGER", nullable: false),
                    user2_id = table.Column<long>(type: "INTEGER", nullable: false),
                    product_id = table.Column<long>(type: "INTEGER", nullable: true),
                    created_at = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_conversations", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "favorites",
                columns: table => new
                {
                    id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    user_id = table.Column<long>(type: "INTEGER", nullable: false),
                    product_id = table.Column<long>(type: "INTEGER", nullable: false),
                    created_at = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_favorites", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "messages",
                columns: table => new
                {
                    id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    conversation_id = table.Column<long>(type: "INTEGER", nullable: false),
                    sender_id = table.Column<long>(type: "INTEGER", nullable: false),
                    text = table.Column<string>(type: "TEXT", nullable: true),
                    is_read = table.Column<long>(type: "INTEGER", nullable: false),
                    created_at = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_messages", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "notifications",
                columns: table => new
                {
                    id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    user_id = table.Column<long>(type: "INTEGER", nullable: false),
                    type = table.Column<string>(type: "TEXT", nullable: true),
                    text = table.Column<string>(type: "TEXT", nullable: true),
                    is_read = table.Column<long>(type: "INTEGER", nullable: false),
                    created_at = table.Column<string>(type: "TEXT", nullable: false),
                    related_user_id = table.Column<long>(type: "INTEGER", nullable: true),
                    related_product_id = table.Column<long>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notifications", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "orders",
                columns: table => new
                {
                    id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    buyer_id = table.Column<long>(type: "INTEGER", nullable: false),
                    seller_id = table.Column<long>(type: "INTEGER", nullable: false),
                    product_id = table.Column<long>(type: "INTEGER", nullable: false),
                    status = table.Column<string>(type: "TEXT", nullable: true),
                    total = table.Column<long>(type: "INTEGER", nullable: false),
                    created_at = table.Column<string>(type: "TEXT", nullable: true),
                    rent_hours = table.Column<long>(type: "INTEGER", nullable: true),
                    appointment_date = table.Column<string>(type: "TEXT", nullable: true),
                    appointment_time = table.Column<string>(type: "TEXT", nullable: true),
                    address_street = table.Column<string>(type: "TEXT", nullable: true),
                    address_house = table.Column<string>(type: "TEXT", nullable: true),
                    house_type = table.Column<string>(type: "TEXT", nullable: true),
                    address_entrance = table.Column<string>(type: "TEXT", nullable: true),
                    address_floor = table.Column<string>(type: "TEXT", nullable: true),
                    address_apartment = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_orders", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "products",
                columns: table => new
                {
                    id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    title = table.Column<string>(type: "TEXT", nullable: true),
                    description = table.Column<string>(type: "TEXT", nullable: true),
                    category_id = table.Column<string>(type: "TEXT", nullable: true),
                    price = table.Column<long>(type: "INTEGER", nullable: false),
                    city = table.Column<string>(type: "TEXT", nullable: true),
                    condition = table.Column<string>(type: "TEXT", nullable: true),
                    views = table.Column<long>(type: "INTEGER", nullable: false),
                    likes = table.Column<long>(type: "INTEGER", nullable: false),
                    seller_id = table.Column<long>(type: "INTEGER", nullable: false),
                    created_at = table.Column<string>(type: "TEXT", nullable: true),
                    is_active = table.Column<long>(type: "INTEGER", nullable: false),
                    details = table.Column<string>(type: "TEXT", nullable: true),
                    images = table.Column<string>(type: "TEXT", nullable: true),
                    sale_type = table.Column<string>(type: "TEXT", nullable: true),
                    auction_ends_at = table.Column<string>(type: "TEXT", nullable: true),
                    auction_step = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_products", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "reviews",
                columns: table => new
                {
                    id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    reviewer_id = table.Column<long>(type: "INTEGER", nullable: false),
                    target_user_id = table.Column<long>(type: "INTEGER", nullable: false),
                    product_id = table.Column<long>(type: "INTEGER", nullable: false),
                    rating = table.Column<long>(type: "INTEGER", nullable: false),
                    text = table.Column<string>(type: "TEXT", nullable: true),
                    images = table.Column<string>(type: "TEXT", nullable: false),
                    created_at = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reviews", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    username = table.Column<string>(type: "TEXT", nullable: true),
                    email = table.Column<string>(type: "TEXT", nullable: true),
                    password = table.Column<string>(type: "TEXT", nullable: true),
                    is_admin = table.Column<long>(type: "INTEGER", nullable: false),
                    phone = table.Column<string>(type: "TEXT", nullable: true),
                    city = table.Column<string>(type: "TEXT", nullable: true),
                    avatar = table.Column<string>(type: "TEXT", nullable: true),
                    created_at = table.Column<string>(type: "TEXT", nullable: true),
                    rating = table.Column<double>(type: "REAL", nullable: false),
                    total_sales = table.Column<long>(type: "INTEGER", nullable: false),
                    total_earnings = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "auction_bids");

            migrationBuilder.DropTable(
                name: "categories");

            migrationBuilder.DropTable(
                name: "conversations");

            migrationBuilder.DropTable(
                name: "favorites");

            migrationBuilder.DropTable(
                name: "messages");

            migrationBuilder.DropTable(
                name: "notifications");

            migrationBuilder.DropTable(
                name: "orders");

            migrationBuilder.DropTable(
                name: "products");

            migrationBuilder.DropTable(
                name: "reviews");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
