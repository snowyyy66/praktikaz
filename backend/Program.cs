using Backend.Data;
using Backend.Middleware;
using Backend.Repositories;
using Backend.Services;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using System.Text.Json;

namespace Backend;

public class Program
{
    public static async Task Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Services.AddControllers()
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
            });

        builder.Services.AddOpenApi();

        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowAll",
                b => b.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
        });

        // EF Core DbContext
        var dbPath = Path.Combine(Directory.GetCurrentDirectory(), "marketplace.db");
        builder.Services.AddDbContext<AppDbContext>(options =>
            options.UseSqlite($"Data Source={dbPath};Cache=Shared"));

        // Legacy Dapper service (используется только ProductService до полного рефакторинга)
        builder.Services.AddSingleton<DbService>();

        // Repositories
        builder.Services.AddScoped<IProductRepository, ProductRepository>();
        builder.Services.AddScoped<IOrderRepository, OrderRepository>();
        builder.Services.AddScoped<IUserRepository, UserRepository>();
        builder.Services.AddScoped<IFavoriteRepository, FavoriteRepository>();
        builder.Services.AddScoped<IAuctionRepository, AuctionRepository>();
        builder.Services.AddScoped<IReviewRepository, ReviewRepository>();
        builder.Services.AddScoped<IConversationRepository, ConversationRepository>();
        builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();

        // Services
        builder.Services.AddScoped<IProductService, ProductService>();
        builder.Services.AddScoped<IOrderService, OrderService>();
        builder.Services.AddScoped<IAuthService, AuthService>();
        builder.Services.AddScoped<IUserService, UserService>();
        builder.Services.AddScoped<IReviewService, ReviewService>();
        builder.Services.AddScoped<IConversationService, ConversationService>();
        builder.Services.AddScoped<ISearchService, SearchService>();
        builder.Services.AddScoped<ICategoryService, CategoryService>();

        // Global Exception Handler
        builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
        builder.Services.AddProblemDetails();

        var app = builder.Build();

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Database.Migrate();
            await SeedData.SeedAsync(db);
        }

        app.MapOpenApi();
        app.MapScalarApiReference();

        app.UseMiddleware<RequestLoggingMiddleware>();
        app.UseExceptionHandler();
        app.UseCors("AllowAll");

        var uploadsPath = Path.Combine(builder.Environment.ContentRootPath, "uploads");
        Directory.CreateDirectory(uploadsPath);
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
            RequestPath = "/uploads",
            OnPrepareResponse = ctx =>
            {
                ctx.Context.Response.Headers.Append("Access-Control-Allow-Origin", "*");
            }
        });

        app.UseAuthorization();
        app.MapControllers();

        app.Run("http://localhost:3000");
    }
}
