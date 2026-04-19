using Backend.Data;
using Backend.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Repositories;

public interface IFavoriteRepository
{
    Task<bool> IsFavoriteAsync(long userId, long productId);
}

public class FavoriteRepository : IFavoriteRepository
{
    private readonly AppDbContext _context;
    public FavoriteRepository(AppDbContext context) => _context = context;
    public async Task<bool> IsFavoriteAsync(long userId, long productId) 
        => await _context.Favorites.AnyAsync(f => f.user_id == userId && f.product_id == productId);
}
