// Запуск API, регистрация сервисов, пайплайн запросов.
using Marketplace.Api;
using Marketplace.Application.Abstractions;
using Marketplace.Infrastructure.Data;
using Marketplace.Infrastructure.Persistence;
using Marketplace.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// Контроллеры + JSON в snake_case, как ожидает фронтенд (user_id, product_id, …).
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = new Marketplace.Api.Serialization.SnakeCaseNamingPolicy();
        o.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });
builder.Services.AddEndpointsApiExplorer();
// OpenAPI / Swagger UI при запуске API.
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Marketplace API", Version = "v1" });
});

// Ошибки домена и валидации → JSON с полем error и кодом 4xx/5xx.
builder.Services.AddExceptionHandler<Marketplace.Api.Middleware.GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

// Для локальной разработки: Vite на другом порту обращается к API.
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddHttpLogging(o =>
{
    o.LoggingFields = Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.RequestPath
        | Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.ResponseStatusCode;
});

// SQLite и uploads — из одной «данных» директории (по умолчанию корень репозитория — см. Marketplace:DataDirectory),
// чтобы руками положить marketplace.db и uploads/ рядом с frontend, а не копировать в папку Api.
var dataRoot = ResolveDataRootPath(builder.Configuration, builder.Environment.ContentRootPath);
builder.Services.AddSingleton(new MarketplacePaths(dataRoot));

var conn = ResolveSqliteConnectionString(builder.Configuration, dataRoot);

builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlite(conn));

// Реализации интерфейсов из Application — одна на HTTP-запрос (scoped).
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IFavoriteService, FavoriteService>();
builder.Services.AddScoped<ISearchService, SearchService>();
builder.Services.AddScoped<IReviewService, ReviewService>();
builder.Services.AddScoped<IConversationService, ConversationService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IAdminService, AdminService>();

var app = builder.Build();

// Загруженные фото товаров отдаются как статика по URL /uploads/...
var uploads = app.Services.GetRequiredService<MarketplacePaths>().UploadsDirectory;
Directory.CreateDirectory(uploads);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploads),
    RequestPath = "/uploads",
});

app.UseSwagger();
app.UseSwaggerUI();

if (app.Environment.IsDevelopment())
    app.UseHttpLogging();

app.UseCors();
app.UseExceptionHandler();
app.MapControllers();

// При старте создаём схему БД (без миграций) и наполняем тестовыми данными.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.EnsureCreatedAsync();
    await SqliteSchemaPatcher.ApplyMissingColumnsAsync(db);
    await DbSeeder.SeedAsync(db);
}

app.Run();

/// <summary>Корень данных: ContentRootPath или подкаталог из Marketplace:DataDirectory (относительно Api).</summary>
static string ResolveDataRootPath(IConfiguration configuration, string contentRoot)
{
    var rel = configuration["Marketplace:DataDirectory"];
    if (string.IsNullOrWhiteSpace(rel))
        return contentRoot;
    return Path.GetFullPath(Path.Combine(contentRoot, rel.Trim()));
}

/// <summary>Собирает строку подключения SQLite; относительный путь в конфиге считается от каталога данных.</summary>
static string ResolveSqliteConnectionString(IConfiguration configuration, string dataRoot)
{
    var cs = configuration.GetConnectionString("Default");
    if (string.IsNullOrWhiteSpace(cs))
        return "Data Source=" + Path.Combine(dataRoot, "marketplace.db");

    const string prefix = "Data Source=";
    var idx = cs.IndexOf(prefix, StringComparison.OrdinalIgnoreCase);
    if (idx < 0)
        return cs;

    var afterPrefix = cs.AsSpan(idx + prefix.Length);
    var semi = afterPrefix.IndexOf(';');
    var pathPart = semi >= 0 ? afterPrefix[..semi].Trim().ToString() : afterPrefix.Trim().ToString();

    if (string.IsNullOrEmpty(pathPart))
        return "Data Source=" + Path.Combine(dataRoot, "marketplace.db");

    var absolute = Path.IsPathRooted(pathPart)
        ? pathPart
        : Path.GetFullPath(Path.Combine(dataRoot, pathPart));
    var suffix = semi >= 0 ? afterPrefix[semi..].ToString() : "";
    return prefix + absolute + suffix;
}

public partial class Program { }
