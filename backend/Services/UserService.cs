using Backend.Repositories;

namespace Backend.Services;

public interface IUserService
{
    Task<object?> GetUserAsync(long id);
    Task<string> UploadAvatarAsync(long id, IFormFile avatar, string contentRootPath);
    Task UpdateUserAsync(long id, string username, string? phone, string? city);
    Task<object> GetProductsAsync(long userId, int page, int limit);
    Task<object> GetStatsAsync(long userId);
    Task<IEnumerable<object>> GetFavoritesAsync(long userId);
    Task<IEnumerable<object>> GetOrdersAsync(long userId);
    Task<object> GetNotificationsAsync(long userId);
    Task MarkAllNotificationsReadAsync(long userId);
}

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private static readonly string[] AllowedAvatarExtensions = { ".jpg", ".jpeg", ".png", ".gif" };

    public UserService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<object?> GetUserAsync(long id)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null) return null;

        return new
        {
            user.id, user.username, user.email, user.is_admin,
            user.phone, user.city, user.avatar, user.created_at,
            user.rating, user.total_sales, user.total_earnings
        };
    }

    public async Task<string> UploadAvatarAsync(long id, IFormFile avatar, string contentRootPath)
    {
        var ext = Path.GetExtension(avatar.FileName).ToLower();
        if (!AllowedAvatarExtensions.Contains(ext))
            throw new ArgumentException($"Формат {ext} не поддерживается. Разрешены только: jpg, jpeg, png, gif");

        var uploadsDir = Path.Combine(contentRootPath, "uploads");
        if (!Directory.Exists(uploadsDir)) Directory.CreateDirectory(uploadsDir);

        var fileName = $"{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{SanitizeFileName(avatar.FileName)}";
        var path = Path.Combine(uploadsDir, fileName);

        using (var stream = new FileStream(path, FileMode.Create))
            await avatar.CopyToAsync(stream);

        var url = $"/uploads/{fileName}";
        await _userRepository.UpdateAvatarAsync(id, url);
        return url;
    }

    public async Task UpdateUserAsync(long id, string username, string? phone, string? city)
    {
        if (id <= 0) throw new ArgumentException("Некорректный id пользователя");
        if (string.IsNullOrWhiteSpace(username)) throw new ArgumentException("Имя не может быть пустым");

        var user = await _userRepository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("Пользователь не найден");

        user.username = username.Trim();
        user.phone = (phone ?? "").Trim();
        user.city = (city ?? "").Trim();
        await _userRepository.UpdateAsync(user);
    }

    public async Task<object> GetProductsAsync(long userId, int page, int limit)
    {
        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);

        var items = await _userRepository.GetProductsPagedAsync(userId, page, limit);
        var total = await _userRepository.GetProductsCountAsync(userId);

        return new { items, page, limit, total_count = total, has_more = total > page * limit };
    }

    public async Task<object> GetStatsAsync(long userId)
    {
        var raw = await _userRepository.GetStatsRawAsync(userId);
        var badges = BuildBadges(raw.SalesCount, raw.TotalProducts);

        return new
        {
            totalProducts = raw.TotalProducts,
            activeProducts = raw.ActiveProducts,
            totalViews = raw.TotalViews,
            totalLikes = raw.TotalLikes,
            sales = new { count = raw.SalesCount, revenue = raw.Revenue },
            purchases = new { count = raw.PurchasesCount, spent = raw.Spent },
            badges
        };
    }

    public async Task<IEnumerable<object>> GetFavoritesAsync(long userId)
        => await _userRepository.GetFavoritesAsync(userId);

    public async Task<IEnumerable<object>> GetOrdersAsync(long userId)
        => await _userRepository.GetOrdersAsync(userId);

    public async Task<object> GetNotificationsAsync(long userId)
    {
        var notifs = await _userRepository.GetNotificationsAsync(userId);
        return notifs;
    }

    public async Task MarkAllNotificationsReadAsync(long userId)
        => await _userRepository.MarkAllNotificationsReadAsync(userId);

    private static List<object> BuildBadges(int salesCount, int catalogCount)
    {
        var badges = new List<object>();

        badges.Add(salesCount switch
        {
            >= 50 => new { title = "Император продаж", hint = $"Продаж: {salesCount}", tone = "gold" },
            >= 20 => new { title = "Гуру сделок", hint = $"Продаж: {salesCount}", tone = "purple" },
            >= 10 => new { title = "Мастер торга", hint = $"Продаж: {salesCount}", tone = "blue" },
            >= 5  => new { title = "Уверенный продавец", hint = $"Продаж: {salesCount}", tone = "green" },
            >= 2  => new { title = "Первый опыт", hint = $"Продаж: {salesCount}", tone = "teal" },
            >= 1  => new { title = "Новичок в продажах", hint = $"Продаж: {salesCount}", tone = "gray" },
            _     => new { title = "Без сделок", hint = "Сделай первую продажу", tone = "gray" }
        });

        badges.Add(catalogCount switch
        {
            >= 120 => new { title = "Король витрины", hint = $"Объявлений: {catalogCount}", tone = "gold" },
            >= 70  => new { title = "Магнат каталога", hint = $"Объявлений: {catalogCount}", tone = "purple" },
            >= 40  => new { title = "Коллекционер лотов", hint = $"Объявлений: {catalogCount}", tone = "blue" },
            >= 20  => new { title = "Активный продавец", hint = $"Объявлений: {catalogCount}", tone = "green" },
            >= 10  => new { title = "Разгон витрины", hint = $"Объявлений: {catalogCount}", tone = "teal" },
            >= 3   => new { title = "Первые лоты", hint = $"Объявлений: {catalogCount}", tone = "gray" },
            _      => new { title = "Пустая витрина", hint = "Добавь первое объявление", tone = "gray" }
        });

        return badges;
    }

    private static string SanitizeFileName(string name)
        => System.Text.RegularExpressions.Regex.Replace(name, "[^a-zA-Z0-9.]", "_");
}
