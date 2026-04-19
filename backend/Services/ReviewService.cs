using Backend.Models.Entities;
using Backend.Repositories;
using System.Text.Json;

namespace Backend.Services;

public interface IReviewService
{
    Task<object> CheckReviewAsync(long userId, long productId);
    Task CreateReviewAsync(long reviewerId, long productId, int rating, string? text, string[]? images);
    Task UpdateReviewAsync(long id, int rating, string? text, string[]? images);
    Task<IEnumerable<string>> UploadMediaAsync(IFormFileCollection files, string contentRootPath);
    Task<IEnumerable<object>> GetByProductAsync(long productId);
    Task<IEnumerable<object>> GetBySellerAsync(long sellerId);
    Task<IEnumerable<object>> GetByReviewerAsync(long reviewerId);
}

public class ReviewService : IReviewService
{
    private readonly IReviewRepository _reviewRepository;
    private const int MaxFiles = 10;
    private const long MaxFileSize = 50 * 1024 * 1024;

    public ReviewService(IReviewRepository reviewRepository)
    {
        _reviewRepository = reviewRepository;
    }

    public async Task<object> CheckReviewAsync(long userId, long productId)
    {
        if (userId <= 0 || productId <= 0)
            throw new ArgumentException("Некорректные параметры");

        var hasPurchased = await _reviewRepository.HasPurchasedAsync(userId, productId);
        var existing = await _reviewRepository.GetByUserAndProductAsync(userId, productId);

        object? userReview = null;
        if (existing != null)
        {
            userReview = new
            {
                existing.id, existing.reviewer_id, existing.product_id,
                existing.rating, existing.text, existing.created_at,
                images = TryDeserializeArray(existing.images)
            };
        }

        return new { can_review = hasPurchased, user_review = userReview };
    }

    public async Task CreateReviewAsync(long reviewerId, long productId, int rating, string? text, string[]? images)
    {
        if (rating < 1 || rating > 5) throw new ArgumentException("Рейтинг от 1 до 5");

        var sellerId = await _reviewRepository.GetSellerIdForProductAsync(productId);
        if (sellerId <= 0) throw new ArgumentException("Товар не найден или у него нет продавца");

        var review = new Review
        {
            reviewer_id = reviewerId,
            target_user_id = sellerId,
            product_id = productId,
            rating = rating,
            text = text ?? "",
            images = JsonSerializer.Serialize(images ?? Array.Empty<string>())
        };

        await _reviewRepository.AddAsync(review);
    }

    public async Task UpdateReviewAsync(long id, int rating, string? text, string[]? images)
    {
        var existing = await _reviewRepository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("Отзыв не найден");

        existing.rating = rating;
        existing.text = text ?? "";
        existing.images = JsonSerializer.Serialize(images ?? Array.Empty<string>());
        await _reviewRepository.UpdateAsync(existing);
    }

    public async Task<IEnumerable<string>> UploadMediaAsync(IFormFileCollection files, string contentRootPath)
    {
        if (files == null || files.Count == 0) throw new ArgumentException("Файлы не загружены");
        if (files.Count > MaxFiles) throw new ArgumentException($"Максимум {MaxFiles} файлов");

        foreach (var file in files)
            if (file.Length > MaxFileSize)
                throw new ArgumentException($"Файл {file.FileName} превышает 50MB");

        var uploadDir = Path.Combine(contentRootPath, "uploads", "reviews");
        if (!Directory.Exists(uploadDir)) Directory.CreateDirectory(uploadDir);

        var savedPaths = new List<string>();
        foreach (var file in files)
        {
            var ext = Path.GetExtension(file.FileName);
            var fileName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(uploadDir, fileName);

            using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);
            savedPaths.Add($"/uploads/reviews/{fileName}");
        }

        return savedPaths;
    }

    public async Task<IEnumerable<object>> GetByProductAsync(long productId)
        => await _reviewRepository.GetByProductAsync(productId);

    public async Task<IEnumerable<object>> GetBySellerAsync(long sellerId)
        => await _reviewRepository.GetBySellerAsync(sellerId);

    public async Task<IEnumerable<object>> GetByReviewerAsync(long reviewerId)
        => await _reviewRepository.GetByReviewerAsync(reviewerId);

    private static string[] TryDeserializeArray(string? json)
    {
        if (string.IsNullOrEmpty(json)) return Array.Empty<string>();
        try { return JsonSerializer.Deserialize<string[]>(json) ?? Array.Empty<string>(); }
        catch { return Array.Empty<string>(); }
    }
}
