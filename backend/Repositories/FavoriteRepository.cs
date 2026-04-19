using Backend.Data;
using Backend.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Repositories;

public interface IFavoriteRepository
{
    Task<bool> IsFavoriteAsync(long userId, long productId);
    Task<bool> ToggleAsync(long userId, long productId);
}

public class FavoriteRepository : IFavoriteRepository
{
    private readonly AppDbContext _context;
    public FavoriteRepository(AppDbContext context) => _context = context;

    public async Task<bool> IsFavoriteAsync(long userId, long productId)
        => await _context.Favorites.AnyAsync(f => f.user_id == userId && f.product_id == productId);

    public async Task<bool> ToggleAsync(long userId, long productId)
    {
        var existing = await _context.Favorites
            .FirstOrDefaultAsync(f => f.user_id == userId && f.product_id == productId);

        if (existing != null)
        {
            _context.Favorites.Remove(existing);
            await _context.SaveChangesAsync();
            return false;
        }

        await _context.Favorites.AddAsync(new Favorite { user_id = userId, product_id = productId });
        await _context.SaveChangesAsync();
        return true;
    }
}
