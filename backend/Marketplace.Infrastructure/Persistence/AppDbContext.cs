// Контекст EF Core: таблицы SQLite, связи между пользователями, товарами, заказами и прочим.
using Marketplace.Core.Entities;
using Marketplace.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace Marketplace.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // --- пользователи и каталог ---
    public DbSet<User> Users => Set<User>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    // заказ + строки заказа (корзина на одного продавца)
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Favorite> Favorites => Set<Favorite>();
    public DbSet<AuctionBid> AuctionBids => Set<AuctionBid>();
    // переписка, отзывы, in-app уведомления
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // уникальные логин/почта; каскады и restrict — чтобы не удалить «чужие» сущности по ошибке
        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Username).IsUnique();
            e.HasIndex(x => x.Email).IsUnique();
        });

        modelBuilder.Entity<Category>(e =>
        {
            e.HasKey(x => x.Id);
        });

        modelBuilder.Entity<Product>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Seller).WithMany(u => u.Products).HasForeignKey(x => x.SellerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Category).WithMany(c => c.Products).HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
            e.Property(x => x.Title).HasMaxLength(512);
            e.Property(x => x.CategoryId).HasMaxLength(64);
        });

        // в БД статус хранится строкой created/completed, в C# — enum
        modelBuilder.Entity<Order>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Buyer).WithMany(u => u.BuyerOrders).HasForeignKey(x => x.BuyerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Seller).WithMany(u => u.SellerOrders).HasForeignKey(x => x.SellerId).OnDelete(DeleteBehavior.Restrict);
            e.Property(x => x.Status).HasConversion(
                v => v == OrderStatus.Completed ? "completed" : "created",
                v => v == "completed" ? OrderStatus.Completed : OrderStatus.Created);
        });

        modelBuilder.Entity<OrderItem>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Order).WithMany(o => o.Items).HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Product).WithMany(p => p.OrderItems).HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Favorite>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.UserId, x.ProductId }).IsUnique();
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AuctionBid>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Product).WithMany(p => p.AuctionBids).HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Bidder).WithMany().HasForeignKey(x => x.BidderId).OnDelete(DeleteBehavior.Restrict).IsRequired();
        });

        modelBuilder.Entity<Conversation>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.User1).WithMany().HasForeignKey(x => x.User1Id).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.User2).WithMany().HasForeignKey(x => x.User2Id).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => new { x.User1Id, x.User2Id, x.ProductId }).IsUnique();
        });

        modelBuilder.Entity<Message>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Conversation).WithMany(c => c.Messages).HasForeignKey(x => x.ConversationId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Sender).WithMany().HasForeignKey(x => x.SenderId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Review>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.ReviewerId, x.ProductId }).IsUnique();
            e.HasOne(x => x.Reviewer).WithMany().HasForeignKey(x => x.ReviewerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.TargetUser).WithMany().HasForeignKey(x => x.TargetUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Notification>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
